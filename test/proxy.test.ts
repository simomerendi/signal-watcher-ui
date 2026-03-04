import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simulate the proxy route logic in isolation
function buildProxyHandler(env: { SIGNAL_WATCHER_URL: string; SIGNAL_WATCHER_TOKEN: string }) {
	return async (
		user: { id: string } | null,
		method: string,
		path: string,
		searchParams: string,
		body?: string,
	): Promise<Response> => {
		if (!user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const sep = searchParams ? '?' + searchParams : '';
		const targetUrl = `${env.SIGNAL_WATCHER_URL}/${path}${sep}`;

		const proxyRequest = new Request(targetUrl, {
			method,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${env.SIGNAL_WATCHER_TOKEN}`,
			},
			body: ['GET', 'HEAD'].includes(method) ? undefined : body,
		});

		const response = await fetch(proxyRequest);
		const text = await response.text();
		return new Response(text, {
			status: response.status,
			headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
		});
	};
}

describe('proxy route', () => {
	const env = {
		SIGNAL_WATCHER_URL: 'https://api.example.com',
		SIGNAL_WATCHER_TOKEN: 'secret-token',
	};

	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify([{ name: 'test' }]), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns 401 when user is null', async () => {
		const handler = buildProxyHandler(env);
		const res = await handler(null, 'GET', 'watchers', '');
		expect(res.status).toBe(401);
		const body = await res.json() as { error: string };
		expect(body.error).toBe('Unauthorized');
	});

	it('forwards request with Bearer token when authenticated', async () => {
		const handler = buildProxyHandler(env);
		const res = await handler({ id: 'user-1' }, 'GET', 'watchers', '');
		expect(res.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledOnce();
		const [calledRequest] = fetchMock.mock.calls[0] as [Request];
		expect(calledRequest.headers.get('Authorization')).toBe('Bearer secret-token');
		expect(calledRequest.url).toBe('https://api.example.com/watchers');
	});

	it('appends query params to target URL', async () => {
		const handler = buildProxyHandler(env);
		await handler({ id: 'user-1' }, 'GET', 'signals', 'limit=10&watcher=test');
		const [calledRequest] = fetchMock.mock.calls[0] as [Request];
		expect(calledRequest.url).toBe('https://api.example.com/signals?limit=10&watcher=test');
	});

	it('does not include body for GET requests', async () => {
		const handler = buildProxyHandler(env);
		await handler({ id: 'user-1' }, 'GET', 'watchers', '');
		const [calledRequest] = fetchMock.mock.calls[0] as [Request];
		expect(calledRequest.body).toBeNull();
	});

	it('includes body for POST requests', async () => {
		const handler = buildProxyHandler(env);
		const body = JSON.stringify({ name: 'test' });
		await handler({ id: 'user-1' }, 'POST', 'watchers', '', body);
		const [calledRequest] = fetchMock.mock.calls[0] as [Request];
		const requestBody = await calledRequest.text();
		expect(requestBody).toBe(body);
	});
});
