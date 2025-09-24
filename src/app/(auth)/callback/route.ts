import { NextResponse } from "next/server";

export async function GET() {
  // Handle OAuth callback if needed
  return NextResponse.json({ ok: true, message: "Auth callback placeholder" });
}

