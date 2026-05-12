type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function now() {
  return Date.now();
}

function cleanupExpiredEntries(currentTime: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= currentTime) {
      rateLimitStore.delete(key);
    }
  }
}

export function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const currentTime = now();
  cleanupExpiredEntries(currentTime);

  const existing = rateLimitStore.get(input.key);

  if (!existing || existing.resetAt <= currentTime) {
    rateLimitStore.set(input.key, {
      count: 1,
      resetAt: currentTime + input.windowMs,
    });

    return {
      allowed: true as const,
      remaining: input.limit - 1,
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  if (existing.count >= input.limit) {
    return {
      allowed: false as const,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
    };
  }

  existing.count += 1;
  rateLimitStore.set(input.key, existing);

  return {
    allowed: true as const,
    remaining: Math.max(0, input.limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
  };
}
