import type { APIRoute } from 'astro';
import { createAuth } from '../../../lib/auth';

export const ALL: APIRoute = async (ctx) => {
	const env = ctx.locals.runtime.env;
	const auth = createAuth(env.AUTH_DB, env.BETTER_AUTH_URL, env.BETTER_AUTH_SECRET);
	return auth.handler(ctx.request);
};
