import posthog from "posthog-js";
import { posthogConfig } from "@/config/posthog.mjs";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
	api_host: posthogConfig.apiHost,
	ui_host: posthogConfig.uiHost,
	defaults: posthogConfig.defaults,
	capture_exceptions: true, // This enables capturing exceptions using Error Tracking
	debug: process.env.NODE_ENV === "development",
});
