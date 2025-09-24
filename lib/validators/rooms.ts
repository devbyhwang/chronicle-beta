// Room validators placeholder
export function validateRoom(input: unknown) {
  if (!input || typeof input !== "object") return { ok: false as const };
  return { ok: true as const };
}

