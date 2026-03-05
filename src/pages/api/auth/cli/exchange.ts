/**
 * POST /api/auth/cli/exchange
 *
 * Exchanges a one-time CLI auth code (issued by /auth/cli) for credentials the CLI
 * can use to call the backend Worker directly.
 *
 * Single-tenant: returns env.SIGNAL_WATCHER_TOKEN (the static bearer token the proxy
 * already uses) — no API key creation needed.
 *
 * Returns: { apiKey: string, baseUrl: string }  — baseUrl is the backend Worker URL
 *          that the CLI should use for subsequent requests.
 */
import type { APIRoute } from 'astro';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { cliAuthCode } from '~/db/schema';

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;

	let body: { code?: string };
	try {
		body = await request.json() as { code?: string };
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	if (!body.code) {
		return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	const db = drizzle(env.AUTH_DB);
	const [row] = await db.select().from(cliAuthCode).where(eq(cliAuthCode.code, body.code)).limit(1);

	if (!row) {
		return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}
	if (row.usedAt) {
		return new Response(JSON.stringify({ error: 'Code already used' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}
	if (new Date(row.expiresAt) < new Date()) {
		return new Response(JSON.stringify({ error: 'Code expired' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	// Mark code as used so it cannot be replayed
	await db.update(cliAuthCode).set({ usedAt: new Date().toISOString() }).where(eq(cliAuthCode.code, body.code));

	return new Response(
		JSON.stringify({ apiKey: env.SIGNAL_WATCHER_TOKEN, baseUrl: env.SIGNAL_WATCHER_URL }),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
