import { describe, it, expect, vi } from 'vitest';

// Unit-test the validateToken logic extracted from AuthEntrypoint
// (We can't instantiate WorkerEntrypoint directly in unit tests)
async function validateToken(
	token: string,
	verifyApiKey: (key: string) => Promise<{ valid: boolean; key: { referenceId: string } | null } | null>,
): Promise<string | null> {
	try {
		const result = await verifyApiKey(token);
		if (result?.valid && result.key?.referenceId) {
			return result.key.referenceId;
		}
		return null;
	} catch {
		return null;
	}
}

describe('validateToken', () => {
	it('returns userId for a valid API key', async () => {
		const verify = vi.fn().mockResolvedValue({ valid: true, key: { referenceId: 'user-123' } });
		const result = await validateToken('valid-key', verify);
		expect(result).toBe('user-123');
	});

	it('returns null for an invalid API key', async () => {
		const verify = vi.fn().mockResolvedValue({ valid: false, key: null });
		const result = await validateToken('bad-key', verify);
		expect(result).toBeNull();
	});

	it('returns null when verifyApiKey throws', async () => {
		const verify = vi.fn().mockRejectedValue(new Error('DB error'));
		const result = await validateToken('any-key', verify);
		expect(result).toBeNull();
	});

	it('returns null when result is null', async () => {
		const verify = vi.fn().mockResolvedValue(null);
		const result = await validateToken('any-key', verify);
		expect(result).toBeNull();
	});

	it('returns null when key has no referenceId', async () => {
		const verify = vi.fn().mockResolvedValue({ valid: true, key: { referenceId: '' } });
		const result = await validateToken('any-key', verify);
		expect(result).toBeNull();
	});
});
