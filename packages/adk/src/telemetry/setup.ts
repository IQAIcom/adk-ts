/**
 * Setup Module
 * OpenTelemetry provider initialization and configuration
 */

import {
	DiagConsoleLogger,
	DiagLogLevel,
	diag,
	metrics,
	trace,
} from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
	detectResources,
	envDetector,
	processDetector,
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
	TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ADK_ATTRS, ADK_SYSTEM_NAME, DEFAULTS, ENV_VARS } from "./constants";
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

		// Detect resources
		const resource = this.createResource(config);

		// Apply defaults
		const enableTracing = config.enableTracing ?? DEFAULTS.ENABLE_TRACING;
		const enableMetrics = config.enableMetrics ?? DEFAULTS.ENABLE_METRICS;
		const enableAutoInstrumentation =
			config.enableAutoInstrumentation ?? DEFAULTS.ENABLE_AUTO_INSTRUMENTATION;

		try {
			// Initialize tracing
			if (enableTracing) {
				this.initializeTracing(config, resource);
			}

			// Initialize metrics
			if (enableMetrics) {
				this.initializeMetrics(config, resource);
			}

			// Initialize NodeSDK for auto-instrumentation
			if (enableAutoInstrumentation) {
				await this.initializeAutoInstrumentation(config, resource);
			}

			this.isInitialized = true;
			diag.info(
				`Telemetry initialized successfully for ${config.appName} v${config.appVersion || "unknown"}`,
			);
		} catch (error) {
			diag.error("Error initializing telemetry:", error);
			throw error;
		}
	}

	/**
	 * Create OpenTelemetry resource with auto-detection
	 */
	private async createResource(config: TelemetryConfig) {
		// Auto-detect resource from environment
		const detectedResource = await detectResources({
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

		// Create sampler if sampling ratio is specified
		const sampler =
			config.samplingRatio !== undefined
				? new TraceIdRatioBasedSampler(config.samplingRatio)
				: undefined;

		this.tracerProvider = new NodeTracerProvider({
			resource,
			sampler,
			spanProcessors: [spanProcessor],
		});

		this.tracerProvider.register();

		// Set global tracer provider
		trace.setGlobalTracerProvider(this.tracerProvider);

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
		resource: any,
	): Promise<void> {
		// NodeSDK will use the already-configured providers
		this.sdk = new NodeSDK({
			resource,
			instrumentations: [
				getNodeAutoInstrumentations({
					// Ignore incoming HTTP requests (we're usually making outgoing calls)
					"@opentelemetry/instrumentation-http": {
						ignoreIncomingRequestHook: () => true,
					},
				}),
			],
		});

		await this.sdk.start();
		diag.debug("Auto-instrumentation initialized");
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
}

// Global singleton instance
export const setupService = new SetupService();
