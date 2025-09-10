import { Controller, Get, Inject, Res } from "@nestjs/common";
import { HotReloadService } from "./hot-reload.service";

// Use a minimal, untyped response to avoid bringing in express types.
type SseWritable = {
	setHeader?: (name: string, value: string) => void;
	write: (chunk: any) => boolean;
	end: () => void;
	on: (event: string, listener: (...args: any[]) => void) => any;
};

@Controller("reload")
export class ReloadController {
	constructor(
		@Inject(HotReloadService) private readonly hotReload: HotReloadService,
	) {}

	@Get("stream")
	stream(@Res() res: SseWritable) {
		// Set SSE headers (compatible with Node's ServerResponse and Express)
		res.setHeader?.("Content-Type", "text/event-stream; charset=utf-8");
		res.setHeader?.("Cache-Control", "no-cache, no-transform");
		res.setHeader?.("Connection", "keep-alive");

		// Initial frame to establish stream
		try {
			res.write(": connected\n\n");
		} catch {}

		// Register client with the broadcast service
		this.hotReload.addClient(res as any);
	}
}
