import { NextResponse } from "next/server";
import { addRoomCategory, getRoomCategories, removeRoomCategory } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function GET(_: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  const categories = getRoomCategories(roomId);
  return NextResponse.json({ roomId, categories });
}

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body?.category || "").trim();
  if (!name) return NextResponse.json({ message: "카테고리를 입력하세요." }, { status: 400 });
  const categories = addRoomCategory(roomId, name);
  return NextResponse.json({ ok: true, categories });
}

export async function DELETE(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  const url = new URL(req.url);
  const name = String(url.searchParams.get("category") || "").trim();
  if (!name) return NextResponse.json({ message: "카테고리를 입력하세요." }, { status: 400 });
  const categories = removeRoomCategory(roomId, name);
  return NextResponse.json({ ok: true, categories });
}

