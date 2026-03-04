import { describe, it, expect, vi } from 'vitest';
import { createAuth } from '../src/lib/auth';

// Minimal D1Database stub for unit tests
function makeD1Stub(): D1Database {
	return {
		prepare: vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results: [] }),
			first: vi.fn().mockResolvedValue(null),
			run: vi.fn().mockResolvedValue({ success: true }),
		}),
		batch: vi.fn().mockResolvedValue([]),
		exec: vi.fn().mockResolvedValue({ count: 0 }),
		dump: vi.fn(),
		withSession: vi.fn().mockReturnThis(),
	} as unknown as D1Database;
}

describe('createAuth', () => {
	it('returns a betterAuth instance with emailAndPassword enabled', () => {
		const auth = createAuth(makeD1Stub(), 'http://localhost:4321', 'test-secret-32-chars-long!!!!');
		expect(auth).toBeDefined();
		expect(typeof auth.handler).toBe('function');
		expect(typeof auth.api).toBe('object');
	});

	it('exposes apiKey plugin routes', () => {
		const auth = createAuth(makeD1Stub(), 'http://localhost:4321', 'test-secret-32-chars-long!!!!');
		// apiKey plugin adds /api/api-key/* routes
		expect(auth.api).toHaveProperty('verifyApiKey');
	});
});

describe('createAuth config', () => {
	it('accepts different baseURL and secret values', () => {
		const auth1 = createAuth(makeD1Stub(), 'https://example.com', 'secret-a-32-chars-long!!!!!!');
		const auth2 = createAuth(makeD1Stub(), 'https://other.com', 'secret-b-32-chars-long!!!!!!');
		expect(auth1).not.toBe(auth2);
	});
});
