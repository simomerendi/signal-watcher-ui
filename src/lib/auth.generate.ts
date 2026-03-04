/**
 * Used ONLY by @better-auth/cli for schema generation:
 *   pnpm run auth:generate
 *
 * The CLI needs a top-level `export const auth` to introspect the config.
 * At runtime we always use createAuth(d1, baseURL, secret) from auth.ts because
 * the D1 binding is only available per-request in Cloudflare Workers.
 *
 * drizzle() and betterAuth() don't call any DB methods during construction,
 * so null is safe here for the purpose of config introspection.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oidcProvider } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export const auth = betterAuth({
	database: drizzleAdapter(drizzle(null as unknown as D1Database), { provider: 'sqlite', schema }),
	emailAndPassword: { enabled: true },
	plugins: [
		apiKey(),
		oidcProvider({ loginPage: '/sign-in', consentPage: '/consent' }),
	],
});
