/**
 * Setup Module
 * OpenTelemetry provider initialization and configuration
 */

import {
	DiagConsoleLogger,
	DiagLogLevel,
	diag,
	metrics,
} from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
	detectResources,
	envDetector,
	processDetector,
	type Resource,
	resourceFromAttributes,
} from "@opentelemetry/resources";
import {
	MeterProvider,
	PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
	BatchSpanProcessor,
	NodeTracerProvider,
	SimpleSpanProcessor,
	SpanProcessor,
	TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ADK_ATTRS, ADK_SYSTEM_NAME, DEFAULTS, ENV_VARS } from "./constants";
import { CustomInMemorySpanExporter } from "./in-memory-exporter";
import type { TelemetryConfig } from "./types";
import {
	getEnvironment,
	getServiceName,
	parseResourceAttributes,
	validateConfig,
} from "./utils";

/**
 * Setup service for OpenTelemetry providers
 */
export class SetupService {
	private sdk: NodeSDK | null = null;
	private meterProvider: MeterProvider | null = null;
	private tracerProvider: NodeTracerProvider | null = null;
	private isInitialized = false;
	private config: TelemetryConfig | null = null;
	private inMemoryExporter = new CustomInMemorySpanExporter();

	/**
	 * Initialize OpenTelemetry with comprehensive configuration
	 */
	async initialize(config: TelemetryConfig): Promise<void> {
		if (this.isInitialized) {
			diag.warn("Telemetry is already initialized. Skipping.");
			return;
		}

		// Validate configuration
		const errors = validateConfig(config);
		if (errors.length > 0) {
			throw new Error(`Invalid telemetry configuration: ${errors.join(", ")}`);
		}

		this.config = config;

		// Set up diagnostic logging
		diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

		// Detect resources (synchronous in v2.x)
		const resource = this.createResource(config);

		// Apply defaults
		const enableTracing = config.enableTracing ?? DEFAULTS.ENABLE_TRACING;
		const enableMetrics = config.enableMetrics ?? DEFAULTS.ENABLE_METRICS;
		const enableAutoInstrumentation =
			config.enableAutoInstrumentation ?? DEFAULTS.ENABLE_AUTO_INSTRUMENTATION;

		try {
			// If auto-instrumentation is enabled, use NodeSDK which handles everything
			if (enableAutoInstrumentation) {
				await this.initializeAutoInstrumentation(config, resource);
			} else {
				// Manual initialization without NodeSDK
				if (enableTracing) {
					this.initializeTracing(config, resource);
				}

				if (enableMetrics) {
					this.initializeMetrics(config, resource);
				}
			}

			this.isInitialized = true;
			diag.info(
				`Telemetry initialized successfully for ${config.appName} v${
					config.appVersion || "unknown"
				}`,
			);
		} catch (error) {
			diag.error("Error initializing telemetry:", error);
			throw error;
		}
	}

	/**
	 * Create OpenTelemetry resource with auto-detection
	 */
	private createResource(config: TelemetryConfig): Resource {
		// Auto-detect resource from environment (synchronous in v2.x)
		const detectedResource = detectResources({
			detectors: [envDetector, processDetector],
		});

		// Build custom attributes
		const customAttributes: Record<string, any> = {
			[ATTR_SERVICE_NAME]: getServiceName(config.appName),
			[ATTR_SERVICE_VERSION]: config.appVersion || "unknown",
			[ADK_ATTRS.SYSTEM_NAME]: ADK_SYSTEM_NAME,
			[ADK_ATTRS.SYSTEM_VERSION]: config.appVersion || "unknown",
		};

		// Add environment if available
		const environment = config.environment || getEnvironment();
		if (environment) {
			customAttributes[ADK_ATTRS.ENVIRONMENT] = environment;
			customAttributes["deployment.environment.name"] = environment;
		}

		// Add custom resource attributes from config
		if (config.resourceAttributes) {
			Object.assign(customAttributes, config.resourceAttributes);
		}

		// Parse OTEL_RESOURCE_ATTRIBUTES if present
		const envAttributes = parseResourceAttributes(
			process.env[ENV_VARS.OTEL_RESOURCE_ATTRIBUTES],
		);
		Object.assign(customAttributes, envAttributes);

		// Merge all resources
		const customResource = resourceFromAttributes(customAttributes);
		return detectedResource.merge(customResource);
	}

	/**
	 * Initialize tracing provider
	 */
	private initializeTracing(config: TelemetryConfig, resource: any): void {
		const traceExporter = new OTLPTraceExporter({
			url: config.otlpEndpoint,
			headers: config.otlpHeaders,
		});

		const spanProcessor = new BatchSpanProcessor(traceExporter);
		const inMemoryProcessor = new SimpleSpanProcessor(this.inMemoryExporter);

		// Create sampler if sampling ratio is specified
		const sampler =
			config.samplingRatio !== undefined
				? new TraceIdRatioBasedSampler(config.samplingRatio)
				: undefined;

		this.tracerProvider = new NodeTracerProvider({
			resource,
			sampler,
			spanProcessors: [spanProcessor, inMemoryProcessor],
		});

		// Only register if not using auto-instrumentation (NodeSDK will register it)
		this.tracerProvider.register();

		diag.debug("Tracing provider initialized");
	}

	/**
	 * Initialize metrics provider
	 */
	private initializeMetrics(config: TelemetryConfig, resource: any): void {
		// Convert trace endpoint to metrics endpoint
		const metricsEndpoint = config.otlpEndpoint.replace(
			"/v1/traces",
			"/v1/metrics",
		);

		// Warn if using Jaeger (which doesn't support metrics)
		if (
			config.otlpEndpoint.includes("localhost:4318") ||
			config.otlpEndpoint.includes("jaeger")
		) {
			diag.warn(
				"Jaeger typically only supports traces, not metrics. Consider using Prometheus or a full OTLP backend for metrics.",
			);
		}

		const metricExporter = new OTLPMetricExporter({
			url: metricsEndpoint,
			headers: config.otlpHeaders,
		});

		const metricReader = new PeriodicExportingMetricReader({
			exporter: metricExporter,
			exportIntervalMillis:
				config.metricExportIntervalMs ?? DEFAULTS.METRIC_EXPORT_INTERVAL_MS,
		});

		this.meterProvider = new MeterProvider({
			resource,
			readers: [metricReader],
		});

		// Set global meter provider
		metrics.setGlobalMeterProvider(this.meterProvider);

		diag.debug("Metrics provider initialized");
	}

	/**
	 * Initialize NodeSDK for auto-instrumentation
	 */
	private async initializeAutoInstrumentation(
		config: TelemetryConfig,
		resource: Resource,
	): Promise<void> {
		const enableTracing = config.enableTracing ?? DEFAULTS.ENABLE_TRACING;
		const enableMetrics = config.enableMetrics ?? DEFAULTS.ENABLE_METRICS;

		// Create exporters
		const traceExporter = enableTracing
			? new OTLPTraceExporter({
					url: config.otlpEndpoint,
					headers: config.otlpHeaders,
				})
			: undefined;

		const metricsEndpoint = config.otlpEndpoint.replace(
			"/v1/traces",
			"/v1/metrics",
		);
		const metricReader = enableMetrics
			? new PeriodicExportingMetricReader({
					exporter: new OTLPMetricExporter({
						url: metricsEndpoint,
						headers: config.otlpHeaders,
					}),
					exportIntervalMillis:
						config.metricExportIntervalMs ?? DEFAULTS.METRIC_EXPORT_INTERVAL_MS,
				})
			: undefined;

		// Create sampler if sampling ratio is specified
		const sampler =
			config.samplingRatio !== undefined
				? new TraceIdRatioBasedSampler(config.samplingRatio)
				: undefined;

		// Create span processors array
		const spanProcessors: SpanProcessor[] = [];

		// Add OTLP exporter processor if tracing is enabled
		if (enableTracing && traceExporter) {
			spanProcessors.push(new BatchSpanProcessor(traceExporter));
		}

		// Always add in-memory processor for local access
		spanProcessors.push(new SimpleSpanProcessor(this.inMemoryExporter));

		console.log("spanProcessors", spanProcessors);

		// NodeSDK will configure and register all providers
		this.sdk = new NodeSDK({
			resource,
			spanProcessors: spanProcessors.length > 0 ? spanProcessors : undefined,
			metricReader,
			sampler,
			instrumentations: [
				getNodeAutoInstrumentations({
					// Ignore incoming HTTP requests (we're usually making outgoing calls)
					"@opentelemetry/instrumentation-http": {
						ignoreIncomingRequestHook: () => true,
					},
				}),
			],
		});

		this.sdk.start();
		diag.debug("Auto-instrumentation initialized with NodeSDK");
	}
	/**
	 * Check if telemetry is initialized
	 */
	get initialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): TelemetryConfig | null {
		return this.config;
	}

	/**
	 * Shutdown telemetry with timeout
	 */
	async shutdown(timeoutMs?: number): Promise<void> {
		const timeout = timeoutMs ?? DEFAULTS.SHUTDOWN_TIMEOUT_MS;
		if (!this.isInitialized) {
			diag.warn("Telemetry is not initialized or already shut down.");
			return;
		}

		try {
			const shutdownPromises: Promise<void>[] = [];

			// Shutdown SDK
			if (this.sdk) {
				shutdownPromises.push(this.sdk.shutdown());
			}

			// Shutdown providers
			if (this.tracerProvider) {
				shutdownPromises.push(this.tracerProvider.shutdown());
			}

			if (this.meterProvider) {
				shutdownPromises.push(this.meterProvider.shutdown());
			}

			// Create timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() =>
						reject(new Error(`Telemetry shutdown timeout after ${timeout}ms`)),
					timeout,
				);
			});

			// Race between shutdown and timeout
			await Promise.race([Promise.all(shutdownPromises), timeoutPromise]);

			this.isInitialized = false;
			this.sdk = null;
			this.tracerProvider = null;
			this.meterProvider = null;

			diag.info("Telemetry shut down successfully");
		} catch (error) {
			if (error instanceof Error && error.message.includes("timeout")) {
				diag.warn("Telemetry shutdown timed out, some data may be lost");
			} else {
				diag.error("Error shutting down telemetry:", error);
			}
			throw error;
		}
	}

	/**
	 * Force flush all pending telemetry data
	 */
	async flush(timeoutMs = 5000): Promise<void> {
		const flushPromises: Promise<void>[] = [];

		if (this.tracerProvider) {
			flushPromises.push(this.tracerProvider.forceFlush());
		}

		if (this.meterProvider) {
			flushPromises.push(this.meterProvider.forceFlush());
		}

		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(
				() => reject(new Error(`Flush timeout after ${timeoutMs}ms`)),
				timeoutMs,
			);
		});

		await Promise.race([Promise.all(flushPromises), timeoutPromise]);
	}

	getInMemoryExporter() {
		return this.inMemoryExporter;
	}
}

// Global singleton instance
export const setupService = new SetupService();
