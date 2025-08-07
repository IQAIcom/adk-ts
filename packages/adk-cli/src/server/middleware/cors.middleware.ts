import { cors } from "hono/cors";

export const corsMiddleware = cors({
	origin: ["http://localhost:3000", "http://localhost:3001"],
	credentials: true,
});
