export class CacheMetadata {
	public readonly cacheName?: string | null;
	public readonly expireTime?: number | null;
	public readonly fingerprint: string;
	public readonly invocationsUsed?: number | null;
	public readonly contentsCount: number;
	public readonly createdAt?: number | null;

	constructor(params: CacheMetadataParams) {
		this.cacheName = params.cacheName ?? null;
		this.expireTime = params.expireTime ?? null;
		this.fingerprint = params.fingerprint;
		this.invocationsUsed = params.invocationsUsed ?? null;
		this.contentsCount = params.contentsCount;
		this.createdAt = params.createdAt ?? null;

		if (!this.fingerprint) {
			throw new Error("fingerprint is required");
		}

		if (this.contentsCount < 0) {
			throw new Error("contentsCount must be >= 0");
		}

		if (this.invocationsUsed !== null && this.invocationsUsed < 0) {
			throw new Error("invocationsUsed must be >= 0");
		}

		Object.freeze(this);
	}

	get expireSoon(): boolean {
		if (this.expireTime == null) {
			return false;
		}
		const bufferSeconds = 120; // 2 minutes
		const nowSeconds = Date.now() / 1000;
		return nowSeconds > this.expireTime - bufferSeconds;
	}

	copy(update: Partial<CacheMetadataParams> = {}): CacheMetadata {
		return new CacheMetadata({
			cacheName: update.cacheName ?? this.cacheName,
			expireTime: update.expireTime ?? this.expireTime,
			fingerprint: update.fingerprint ?? this.fingerprint,
			invocationsUsed: update.invocationsUsed ?? this.invocationsUsed,
			contentsCount: update.contentsCount ?? this.contentsCount,
			createdAt: update.createdAt ?? this.createdAt,
		});
	}

	toString() {
		if (!this.cacheName) {
			return (
				`Fingerprint-only: ${this.contentsCount} contents, ` +
				`fingerprint=${this.fingerprint.slice(0, 8)}...`
			);
		}

		const cacheId = this.cacheName.split("/").pop();
		const nowSeconds = Date.now() / 1000;

		const timeUntilExpiryMinutes =
			this.expireTime != null
				? (this.expireTime - nowSeconds) / 60
				: Number.NaN;

		return (
			`Cache ${cacheId}: used ${this.invocationsUsed} invocations, ` +
			`cached ${this.contentsCount} contents, ` +
			`expires in ${timeUntilExpiryMinutes.toFixed(1)}min`
		);
	}
}

export interface CacheMetadataParams {
	cacheName?: string | null;
	expireTime?: number | null;
	fingerprint: string;
	invocationsUsed?: number | null;
	contentsCount: number;
	createdAt?: number | null;
}
