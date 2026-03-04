import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oidcProvider } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export function createAuth(d1: D1Database, baseURL: string, secret: string) {
	// trustedOrigins includes baseURL automatically; also accept common localhost
	// ports so the dev server works regardless of which port Astro binds to.
	const localhostOrigins = ['http://localhost:4321', 'http://localhost:4322', 'http://localhost:4323'];

	return betterAuth({
		database: drizzleAdapter(drizzle(d1), { provider: 'sqlite', schema }),
		secret,
		baseURL,
		trustedOrigins: localhostOrigins,
		emailAndPassword: { enabled: true },
		plugins: [
			apiKey(),
			oidcProvider({ loginPage: '/sign-in', consentPage: '/consent' }),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;
