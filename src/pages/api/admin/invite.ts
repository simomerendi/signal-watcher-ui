import type { APIRoute } from 'astro';
import { drizzle } from 'drizzle-orm/d1';
import { invitation } from '~/db/schema';

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;

	const authHeader = request.headers.get('Authorization') ?? '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
	if (!token || token !== env.ADMIN_TOKEN) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let email: string | undefined;
	let expiresInDays: number | undefined;
	const contentType = request.headers.get('Content-Type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			const body = await request.json() as { email?: string; expiresInDays?: number };
			email = body.email;
			expiresInDays = body.expiresInDays;
		} catch {
			// empty body is fine
		}
	}

	const expiresAt = expiresInDays != null
		? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
		: null;

	const db = drizzle(env.AUTH_DB);
	const [row] = await db
		.insert(invitation)
		.values({ email: email ?? null, expiresAt })
		.returning({ token: invitation.token });

	const signUpUrl = `${env.BETTER_AUTH_URL}/sign-up?token=${row.token}`;
	return new Response(JSON.stringify({ token: row.token, signUpUrl }), {
		status: 201,
		headers: { 'Content-Type': 'application/json' },
	});
};
