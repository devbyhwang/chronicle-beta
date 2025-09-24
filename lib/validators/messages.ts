// Message validators placeholder
export function validateMessage(input: unknown) {
  if (!input || typeof input !== "object") return { ok: false as const };
  return { ok: true as const };
}

