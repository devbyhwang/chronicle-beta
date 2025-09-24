import { NextResponse } from "next/server";
import { createRoom, listRooms } from "@/server/inmemory";

export async function GET() {
  // List rooms (in-memory)
  const rooms = listRooms().map((r, i) => ({ id: r.id, name: r.name, members: 20 + i * 7 }));
  return NextResponse.json({ rooms });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    if (!name || name.length < 2) {
      return NextResponse.json({ message: "방 이름은 2자 이상이어야 합니다." }, { status: 400 });
    }
    const room = createRoom({
      name,
      description: body?.description,
      tags: Array.isArray(body?.tags) ? body.tags.slice(0, 8) : undefined,
      rules: body?.rules,
      visibility: body?.visibility,
      starred: !!body?.starred,
    });
    const id = room.id;
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
