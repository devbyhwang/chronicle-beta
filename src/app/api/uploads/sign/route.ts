import { NextResponse } from "next/server";
import crypto from "node:crypto";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const filename = String(body?.filename || "file.bin");
  const id = crypto.randomUUID().slice(0, 8);
  const safe = sanitize(filename);
  const uploadUrl = `/api/uploads/put?id=${encodeURIComponent(id)}&filename=${encodeURIComponent(safe)}`;
  const fileUrl = `/uploads/${id}-${safe}`;
  return NextResponse.json({ uploadUrl, fileUrl });
}

