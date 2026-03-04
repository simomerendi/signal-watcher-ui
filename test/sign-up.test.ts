import { describe, it, expect } from 'vitest';

// Mirrors the invitation validation logic in src/pages/sign-up.astro
type InvitationRow = {
	token: string;
	email: string | null;
	usedAt: string | null;
	expiresAt: string | null;
};

function validateInvite(row: InvitationRow | null): string | null {
	if (!row) return 'This invitation is invalid or has already been used.';
	if (row.usedAt) return 'This invitation is invalid or has already been used.';
	if (row.expiresAt && new Date(row.expiresAt) < new Date()) return 'This invitation is invalid or has already been used.';
	return null;
}

// Simulates the GET page load logic
function buildGetHandler(db: Map<string, InvitationRow>) {
	return (tokenParam: string): { showForm: boolean; error: string } => {
		if (!tokenParam) return { showForm: false, error: 'You need an invitation to sign up.' };
		const row = db.get(tokenParam) ?? null;
		const err = validateInvite(row);
		if (err) return { showForm: false, error: err };
		return { showForm: true, error: '' };
	};
}

// Simulates the POST form submit logic
function buildPostHandler(db: Map<string, InvitationRow>) {
	return (token: string, email: string): { ok: boolean; error: string; tokenConsumed: boolean } => {
		const row = db.get(token) ?? null;
		const err = validateInvite(row);
		if (err) return { ok: false, error: err, tokenConsumed: false };
		if (row!.email && row!.email !== email) {
			return { ok: false, error: 'This invitation is restricted to a different email address.', tokenConsumed: false };
		}
		// Mark used (mutate map to simulate DB update)
		db.set(token, { ...row!, usedAt: new Date().toISOString() });
		return { ok: true, error: '', tokenConsumed: true };
	};
}

function makeRow(overrides: Partial<InvitationRow> = {}): InvitationRow {
	return {
		token: 'tok-valid',
		email: null,
		usedAt: null,
		expiresAt: null,
		...overrides,
	};
}

describe('sign-up page — GET (page load)', () => {
	it('shows error when no token param', () => {
		const get = buildGetHandler(new Map());
		const res = get('');
		expect(res.showForm).toBe(false);
		expect(res.error).toBe('You need an invitation to sign up.');
	});

	it('shows form for a valid unused token', () => {
		const db = new Map([['tok-valid', makeRow()]]);
		const get = buildGetHandler(db);
		const res = get('tok-valid');
		expect(res.showForm).toBe(true);
		expect(res.error).toBe('');
	});

	it('shows error for unknown token', () => {
		const get = buildGetHandler(new Map());
		const res = get('tok-unknown');
		expect(res.showForm).toBe(false);
		expect(res.error).toBe('This invitation is invalid or has already been used.');
	});

	it('shows error when token is already used', () => {
		const db = new Map([['tok-used', makeRow({ token: 'tok-used', usedAt: '2026-01-01T00:00:00.000Z' })]]);
		const get = buildGetHandler(db);
		const res = get('tok-used');
		expect(res.showForm).toBe(false);
		expect(res.error).toBe('This invitation is invalid or has already been used.');
	});

	it('shows error when token is expired', () => {
		const db = new Map([['tok-exp', makeRow({ token: 'tok-exp', expiresAt: '2020-01-01T00:00:00.000Z' })]]);
		const get = buildGetHandler(db);
		const res = get('tok-exp');
		expect(res.showForm).toBe(false);
		expect(res.error).toBe('This invitation is invalid or has already been used.');
	});

	it('shows form when token has a future expiry', () => {
		const future = new Date(Date.now() + 86_400_000).toISOString();
		const db = new Map([['tok-future', makeRow({ token: 'tok-future', expiresAt: future })]]);
		const get = buildGetHandler(db);
		const res = get('tok-future');
		expect(res.showForm).toBe(true);
	});
});

describe('sign-up page — POST (form submit)', () => {
	it('succeeds and marks token as used', () => {
		const db = new Map([['tok-valid', makeRow()]]);
		const post = buildPostHandler(db);
		const res = post('tok-valid', 'alice@example.com');
		expect(res.ok).toBe(true);
		expect(res.tokenConsumed).toBe(true);
		expect(db.get('tok-valid')!.usedAt).not.toBeNull();
	});

	it('returns error and does not consume token for unknown token', () => {
		const db = new Map<string, InvitationRow>();
		const post = buildPostHandler(db);
		const res = post('tok-bad', 'alice@example.com');
		expect(res.ok).toBe(false);
		expect(res.tokenConsumed).toBe(false);
	});

	it('returns error and does not consume already-used token', () => {
		const db = new Map([['tok-used', makeRow({ token: 'tok-used', usedAt: '2026-01-01T00:00:00.000Z' })]]);
		const post = buildPostHandler(db);
		const res = post('tok-used', 'alice@example.com');
		expect(res.ok).toBe(false);
		expect(res.tokenConsumed).toBe(false);
	});

	it('returns error when email does not match pre-set email on invite', () => {
		const db = new Map([['tok-email', makeRow({ token: 'tok-email', email: 'bob@example.com' })]]);
		const post = buildPostHandler(db);
		const res = post('tok-email', 'alice@example.com');
		expect(res.ok).toBe(false);
		expect(res.error).toBe('This invitation is restricted to a different email address.');
		expect(res.tokenConsumed).toBe(false);
	});

	it('succeeds when submitted email matches pre-set email on invite', () => {
		const db = new Map([['tok-email', makeRow({ token: 'tok-email', email: 'bob@example.com' })]]);
		const post = buildPostHandler(db);
		const res = post('tok-email', 'bob@example.com');
		expect(res.ok).toBe(true);
	});

	it('returns error and does not consume expired token', () => {
		const db = new Map([['tok-exp', makeRow({ token: 'tok-exp', expiresAt: '2020-01-01T00:00:00.000Z' })]]);
		const post = buildPostHandler(db);
		const res = post('tok-exp', 'alice@example.com');
		expect(res.ok).toBe(false);
		expect(res.tokenConsumed).toBe(false);
	});
});
