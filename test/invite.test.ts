import { describe, it, expect } from 'vitest';

// Mirrors the logic in src/pages/api/admin/invite.ts
type InviteRow = { token: string; email: string | null; expiresAt: string | null };

function buildInviteHandler(env: { ADMIN_TOKEN: string; BETTER_AUTH_URL: string }) {
	return async (
		authHeader: string,
		body?: { email?: string; expiresInDays?: number },
	): Promise<{ status: number; body: unknown; inserted?: InviteRow }> => {
		const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
		if (!token || token !== env.ADMIN_TOKEN) {
			return { status: 401, body: { error: 'Unauthorized' } };
		}

		const expiresAt =
			body?.expiresInDays != null
				? new Date(Date.now() + body.expiresInDays * 86_400_000).toISOString()
				: null;

		const inserted: InviteRow = {
			token: crypto.randomUUID(),
			email: body?.email ?? null,
			expiresAt,
		};

		const signUpUrl = `${env.BETTER_AUTH_URL}/sign-up?token=${inserted.token}`;
		return { status: 201, body: { token: inserted.token, signUpUrl }, inserted };
	};
}

describe('POST /api/admin/invite', () => {
	const env = { ADMIN_TOKEN: 'secret-admin', BETTER_AUTH_URL: 'http://localhost:4321' };

	it('returns 401 when Authorization header is missing', async () => {
		const handler = buildInviteHandler(env);
		const res = await handler('');
		expect(res.status).toBe(401);
		expect(res.body).toEqual({ error: 'Unauthorized' });
	});

	it('returns 401 when token is wrong', async () => {
		const handler = buildInviteHandler(env);
		const res = await handler('Bearer wrong-token');
		expect(res.status).toBe(401);
	});

	it('returns 201 with token and signUpUrl on success', async () => {
		const handler = buildInviteHandler(env);
		const res = await handler('Bearer secret-admin');
		expect(res.status).toBe(201);
		const body = res.body as { token: string; signUpUrl: string };
		expect(body.token).toBeTypeOf('string');
		expect(body.signUpUrl).toBe(`http://localhost:4321/sign-up?token=${body.token}`);
	});

	it('stores email on the invitation when provided', async () => {
		const handler = buildInviteHandler(env);
		const res = await handler('Bearer secret-admin', { email: 'alice@example.com' });
		expect(res.status).toBe(201);
		expect(res.inserted?.email).toBe('alice@example.com');
	});

	it('stores expiresAt when expiresInDays is provided', async () => {
		const before = Date.now();
		const handler = buildInviteHandler(env);
		const res = await handler('Bearer secret-admin', { expiresInDays: 7 });
		const after = Date.now();
		expect(res.inserted?.expiresAt).not.toBeNull();
		const expires = new Date(res.inserted!.expiresAt!).getTime();
		expect(expires).toBeGreaterThanOrEqual(before + 7 * 86_400_000);
		expect(expires).toBeLessThanOrEqual(after + 7 * 86_400_000);
	});

	it('sets expiresAt to null when expiresInDays is not provided', async () => {
		const handler = buildInviteHandler(env);
		const res = await handler('Bearer secret-admin');
		expect(res.inserted?.expiresAt).toBeNull();
	});
});
