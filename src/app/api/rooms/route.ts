import { NextResponse } from "next/server";
import { createRoom, listRooms } from "@/lib/database";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // List rooms from database
    const rooms = await listRooms();
    const roomsWithMembers = await Promise.all(
      rooms.map(async (room) => {
        // 실제 참여자 수 계산 (메시지를 작성한 고유 사용자 수)
        const memberCount = await prisma.message.groupBy({
          by: ['userId'],
          where: { 
            roomId: room.id,
            userId: { not: null }
          },
          _count: { userId: true }
        });
        
        return { 
          id: room.id, 
          name: room.name, 
          description: room.description,
          tags: room.tags,
          members: memberCount.length || 0
        };
      })
    );
    
    return NextResponse.json({ rooms: roomsWithMembers });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    
    // 데이터베이스 연결 실패 시 기본 방 목록 반환
    const fallbackRooms = [
      { id: 'demo-1', name: '데모 방 1', description: '데모용 채팅방입니다', tags: ['demo'], members: 0 },
      { id: 'demo-2', name: '데모 방 2', description: '데모용 채팅방입니다', tags: ['demo'], members: 0 },
    ];
    
    return NextResponse.json({ rooms: fallbackRooms });
  }
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
