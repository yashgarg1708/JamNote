export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
) {
  const out = {} as Pick<T, K>;
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}
