import { NextResponse } from "next/server";
import { getRoom } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function GET(_: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  const room = getRoom(roomId);
  if (!room) return NextResponse.json({ message: "방을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({
    room: {
      id: room.id,
      name: room.name,
      description: room.description,
      tags: room.tags ?? [],
      rules: room.rules,
      visibility: room.visibility,
      createdAt: room.createdAt,
    },
  });
}
