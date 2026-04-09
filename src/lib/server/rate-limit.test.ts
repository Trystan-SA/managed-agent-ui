import { describe, it, expect } from 'vitest';
import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
	it('allows requests within the limit', () => {
		const ip = 'test-allow-' + Date.now();
		for (let i = 0; i < 5; i++) {
			expect(checkRateLimit(ip)).toBe(true);
		}
	});

	it('blocks requests exceeding the limit', () => {
		const ip = 'test-block-' + Date.now();
		for (let i = 0; i < 5; i++) {
			checkRateLimit(ip);
		}
		expect(checkRateLimit(ip)).toBe(false);
	});

	it('respects custom maxRequests', () => {
		const ip = 'test-custom-' + Date.now();
		expect(checkRateLimit(ip, 2)).toBe(true);
		expect(checkRateLimit(ip, 2)).toBe(true);
		expect(checkRateLimit(ip, 2)).toBe(false);
	});

	it('isolates different IPs', () => {
		const ip1 = 'test-ip1-' + Date.now();
		const ip2 = 'test-ip2-' + Date.now();
		for (let i = 0; i < 5; i++) {
			checkRateLimit(ip1);
		}
		expect(checkRateLimit(ip1)).toBe(false);
		expect(checkRateLimit(ip2)).toBe(true);
	});
});
