import type { SSRManifest } from 'astro';
import { createExports as defaultCreateExports } from '@astrojs/cloudflare/entrypoints/server.js';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { createAuth } from './lib/auth';

export function createExports(manifest: SSRManifest) {
	const base = defaultCreateExports(manifest);
	return { ...base, AuthEntrypoint };
}

export class AuthEntrypoint extends WorkerEntrypoint<Env> {
	/** Validate a Better Auth API key; returns the owner userId or null. */
	async validateToken(token: string): Promise<string | null> {
		const env = this.env;
		const auth = createAuth(env.AUTH_DB, env.BETTER_AUTH_URL, env.BETTER_AUTH_SECRET);
		try {
			const result = await auth.api.verifyApiKey({ body: { key: token } });
			if (result?.valid && result.key?.referenceId) {
				return result.key.referenceId;
			}
			return null;
		} catch {
			return null;
		}
	}
}
