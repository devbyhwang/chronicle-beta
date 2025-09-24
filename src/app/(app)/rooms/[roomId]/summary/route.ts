import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  // Trigger AI summary pipeline (placeholder)
  return NextResponse.json({ ok: true, summary: "This is a mock summary." });
}

