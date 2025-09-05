import { Injectable } from "@nestjs/common";

type SseResponse = {
	write: (chunk: any) => boolean;
	end: () => void;
	on: (event: string, listener: (...args: any[]) => void) => any;
	setHeader?: (name: string, value: string) => void;
};

interface ReloadEvent {
	type: "reload";
	filename?: string | null;
	timestamp: number;
}

@Injectable()
export class HotReloadService {
	private clients = new Set<SseResponse>();
	private keepAliveTimers = new Map<SseResponse, NodeJS.Timeout>();

	addClient(res: SseResponse): void {
		this.clients.add(res);

		// Remove on close
		res.on("close", () => {
			this.removeClient(res);
		});

		// Initial comment to open stream
		try {
			res.write(": connected\n\n");
		} catch {
			// ignore
		}

		// Keepalive to prevent proxies from closing the connection
		const timer = setInterval(() => {
			try {
				res.write(`: ping ${Date.now()}\n\n`);
			} catch {
				this.removeClient(res);
			}
		}, 25000);
		this.keepAliveTimers.set(res, timer);
	}

	removeClient(res: SseResponse): void {
		if (this.keepAliveTimers.has(res)) {
			clearInterval(this.keepAliveTimers.get(res)!);
			this.keepAliveTimers.delete(res);
		}
		if (this.clients.has(res)) {
			try {
				res.end();
			} catch {
				// ignore
			}
			this.clients.delete(res);
		}
	}

	broadcast(filename?: string | null): void {
		const payload: ReloadEvent = {
			type: "reload",
			filename: filename ?? null,
			timestamp: Date.now(),
		};
		const data = `data: ${JSON.stringify(payload)}\n\n`;
		for (const res of Array.from(this.clients)) {
			try {
				res.write(data);
			} catch {
				this.removeClient(res);
			}
		}
	}

	closeAll(): void {
		for (const res of Array.from(this.clients)) {
			this.removeClient(res);
		}
	}
}
