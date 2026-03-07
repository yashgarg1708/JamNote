import type { NextFunction, Request, Response } from "express";

type RateLimiterOptions = {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

export function rateLimit(options: RateLimiterOptions) {
  const windowMs = options.windowMs;
  const max = options.max;
  const message = options.message ?? "Too many requests. Please try again later.";
  const keyPrefix = options.keyPrefix ?? "global";
  const store = new Map<string, RateEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message });
    }

    existing.count += 1;
    store.set(key, existing);

    // Light cleanup to avoid unbounded growth in long-lived processes.
    if (store.size > 5000) {
      for (const [entryKey, entry] of store.entries()) {
        if (entry.resetAt <= now) store.delete(entryKey);
      }
    }

    return next();
  };
}
