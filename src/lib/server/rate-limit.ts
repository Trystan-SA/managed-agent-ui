const windows = new Map<string, number[]>();

const CLEANUP_INTERVAL = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of windows) {
    const valid = timestamps.filter((t) => now - t < 60_000);
    if (valid.length === 0) windows.delete(key);
    else windows.set(key, valid);
  }
}, CLEANUP_INTERVAL);

/**
 * Check if a request from the given IP is within the rate limit.
 * Returns `true` if the request is allowed, `false` if it should be rejected.
 */
export function checkRateLimit(ip: string, maxRequests = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const timestamps = windows.get(ip) ?? [];
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= maxRequests) {
    windows.set(ip, valid);
    return false;
  }

  valid.push(now);
  windows.set(ip, valid);
  return true;
}
