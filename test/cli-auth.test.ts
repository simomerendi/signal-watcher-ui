import { describe, it, expect } from 'vitest';

// Mirrors the redirect_uri validation logic in src/pages/auth/cli.astro
function isAllowedRedirectUri(redirectUri: string, extraCliRedirectOrigins: string): boolean {
	const isLocalhost = /^http:\/\/localhost(:\d+)?/.test(redirectUri);
	const extraOrigins = extraCliRedirectOrigins
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const isAllowedExtra = extraOrigins.some((origin) => redirectUri.startsWith(origin));
	return isLocalhost || isAllowedExtra;
}

describe('redirect_uri validation', () => {
	describe('localhost (CLI swatcher login)', () => {
		it('allows http://localhost with no port', () => {
			expect(isAllowedRedirectUri('http://localhost/callback', '')).toBe(true);
		});

		it('allows http://localhost:<port>', () => {
			expect(isAllowedRedirectUri('http://localhost:8080/callback', '')).toBe(true);
			expect(isAllowedRedirectUri('http://localhost:59423/callback', '')).toBe(true);
		});

		it('rejects https://localhost (must be http for localhost)', () => {
			expect(isAllowedRedirectUri('https://localhost:8080/callback', '')).toBe(false);
		});
	});

	describe('EXTRA_CLI_REDIRECT_ORIGINS (MCP callback)', () => {
		const extra = 'https://signal-watcher-mcp.merendis.workers.dev';

		it('allows redirect_uri that starts with a configured extra origin', () => {
			expect(isAllowedRedirectUri('https://signal-watcher-mcp.merendis.workers.dev/callback', extra)).toBe(true);
		});

		it('rejects redirect_uri from an unlisted origin even if HTTPS', () => {
			expect(isAllowedRedirectUri('https://evil.example.com/callback', extra)).toBe(false);
		});

		it('supports multiple comma-separated origins', () => {
			const multi = 'https://mcp-a.example.com,https://mcp-b.example.com';
			expect(isAllowedRedirectUri('https://mcp-a.example.com/callback', multi)).toBe(true);
			expect(isAllowedRedirectUri('https://mcp-b.example.com/callback', multi)).toBe(true);
			expect(isAllowedRedirectUri('https://mcp-c.example.com/callback', multi)).toBe(false);
		});

		it('ignores extra whitespace around comma-separated origins', () => {
			const multi = ' https://mcp-a.example.com , https://mcp-b.example.com ';
			expect(isAllowedRedirectUri('https://mcp-a.example.com/callback', multi)).toBe(true);
		});
	});

	describe('invalid URIs', () => {
		it('rejects empty string', () => {
			expect(isAllowedRedirectUri('', '')).toBe(false);
		});

		it('rejects arbitrary HTTPS URL with no extra origins configured', () => {
			expect(isAllowedRedirectUri('https://attacker.com/steal', '')).toBe(false);
		});
	});
});
