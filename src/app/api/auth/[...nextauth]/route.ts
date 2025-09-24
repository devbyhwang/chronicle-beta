import { NextResponse } from "next/server";

// Placeholder. Replace with NextAuth/Clerk implementation.
export async function GET() {
  return NextResponse.json({ ok: true, provider: "nextauth (placeholder)" });
}

export async function POST() {
  return NextResponse.json({ ok: true });
}

