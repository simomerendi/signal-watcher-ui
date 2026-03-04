import type { APIRoute } from 'astro';

export const ALL: APIRoute = async (ctx) => {
	// Require authenticated session
	if (!ctx.locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const env = ctx.locals.runtime.env;
	const path = ctx.params.path ?? '';
	const targetUrl = `${env.SIGNAL_WATCHER_URL}/${path}${ctx.request.url.includes('?') ? '?' + new URL(ctx.request.url).searchParams.toString() : ''}`;

	// Forward the request with the static bearer token — never exposed to the client
	const proxyRequest = new Request(targetUrl, {
		method: ctx.request.method,
		headers: {
			'Content-Type': ctx.request.headers.get('Content-Type') ?? 'application/json',
			'Authorization': `Bearer ${env.SIGNAL_WATCHER_TOKEN}`,
		},
		body: ['GET', 'HEAD'].includes(ctx.request.method) ? undefined : await ctx.request.text(),
	});

	const response = await fetch(proxyRequest);
	const body = await response.text();

	return new Response(body, {
		status: response.status,
		headers: {
			'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
		},
	});
};
