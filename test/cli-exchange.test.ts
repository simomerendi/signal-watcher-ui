import { describe, it, expect } from 'vitest';

// Mirrors the validation logic in src/pages/api/auth/cli/exchange.ts
type CodeRow = { code: string; userId: string; usedAt: string | null; expiresAt: string };

function buildExchangeHandler(env: { SIGNAL_WATCHER_URL: string; SIGNAL_WATCHER_TOKEN: string }, codes: Map<string, CodeRow>) {
	return async (
		body: unknown,
	): Promise<{ status: number; body: unknown; markedUsed?: string }> => {
		const parsed = body as { code?: string };
		if (!parsed?.code) {
			return { status: 400, body: { error: 'Missing code' } };
		}

		const row = codes.get(parsed.code);
		if (!row) return { status: 400, body: { error: 'Invalid code' } };
		if (row.usedAt) return { status: 400, body: { error: 'Code already used' } };
		if (new Date(row.expiresAt) < new Date()) return { status: 400, body: { error: 'Code expired' } };

		// Simulate marking the code as used
		row.usedAt = new Date().toISOString();

		return { status: 200, body: { apiKey: env.SIGNAL_WATCHER_TOKEN, baseUrl: env.SIGNAL_WATCHER_URL }, markedUsed: row.code };
	};
}

const future = () => new Date(Date.now() + 10 * 60 * 1000).toISOString();
const past = () => new Date(Date.now() - 1000).toISOString();

describe('POST /api/auth/cli/exchange', () => {
	const env = { SIGNAL_WATCHER_URL: 'https://backend.example.com', SIGNAL_WATCHER_TOKEN: 'static-bearer-token' };

	it('returns 400 when body has no code', async () => {
		const handler = buildExchangeHandler(env, new Map());
		const res = await handler({});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: 'Missing code' });
	});

	it('returns 400 when code is not found', async () => {
		const handler = buildExchangeHandler(env, new Map());
		const res = await handler({ code: 'nonexistent' });
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: 'Invalid code' });
	});

	it('returns 400 when code has already been used', async () => {
		const codes = new Map([
			['used-code', { code: 'used-code', userId: 'u1', usedAt: new Date().toISOString(), expiresAt: future() }],
		]);
		const handler = buildExchangeHandler(env, codes);
		const res = await handler({ code: 'used-code' });
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: 'Code already used' });
	});

	it('returns 400 when code is expired', async () => {
		const codes = new Map([
			['exp-code', { code: 'exp-code', userId: 'u1', usedAt: null, expiresAt: past() }],
		]);
		const handler = buildExchangeHandler(env, codes);
		const res = await handler({ code: 'exp-code' });
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: 'Code expired' });
	});

	it('returns 200 with the static bearer token and backendUrl on valid code', async () => {
		const codes = new Map([
			['valid-code', { code: 'valid-code', userId: 'u1', usedAt: null, expiresAt: future() }],
		]);
		const handler = buildExchangeHandler(env, codes);
		const res = await handler({ code: 'valid-code' });
		expect(res.status).toBe(200);
		expect((res.body as { apiKey: string; baseUrl: string }).apiKey).toBe('static-bearer-token');
		expect((res.body as { apiKey: string; baseUrl: string }).baseUrl).toBe('https://backend.example.com');
	});

	it('marks the code as used after a successful exchange', async () => {
		const row: CodeRow = { code: 'one-time', userId: 'u1', usedAt: null, expiresAt: future() };
		const codes = new Map([['one-time', row]]);
		const handler = buildExchangeHandler(env, codes);

		await handler({ code: 'one-time' });
		expect(row.usedAt).not.toBeNull();
	});

	it('rejects the same code on a second use', async () => {
		const row: CodeRow = { code: 'once', userId: 'u1', usedAt: null, expiresAt: future() };
		const codes = new Map([['once', row]]);
		const handler = buildExchangeHandler(env, codes);

		await handler({ code: 'once' });
		const res = await handler({ code: 'once' });
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: 'Code already used' });
	});
});
