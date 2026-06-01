export const MAX_ORDER_QUANTITY = 50;

export const MIN_REVIEW_BODY_LENGTH = 3;
export const MAX_REVIEW_BODY_LENGTH = 500;
export const MAX_REVIEW_AUTHOR_LENGTH = 80;

export function clampInteger(value, min, max, fallback = min) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function sanitizeText(value, { maxLength, fallback = "" } = {}) {
  const cleaned = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const limited = typeof maxLength === "number" ? cleaned.slice(0, maxLength).trim() : cleaned;
  return limited || fallback;
}
