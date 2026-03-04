import { defineMiddleware } from 'astro:middleware';
import { createAuth } from './lib/auth';

export const onRequest = defineMiddleware(async (ctx, next) => {
	const env = ctx.locals.runtime.env;
	const auth = createAuth(env.AUTH_DB, env.BETTER_AUTH_URL, env.BETTER_AUTH_SECRET);
	const session = await auth.api.getSession({
		headers: ctx.request.headers,
	});

	ctx.locals.user = session?.user ?? null;
	ctx.locals.session = session?.session ?? null;

	return next();
});
