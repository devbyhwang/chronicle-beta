import { NextResponse } from "next/server";
import { getRoom } from "@/lib/database";
import { prisma } from "@/lib/db";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function GET(_: Request, { params }: ParamsArg) {
  try {
    const { roomId } = await params;
    const room = await getRoom(roomId);
    
    if (!room) {
      return NextResponse.json({ message: "방을 찾을 수 없습니다." }, { status: 404 });
    }
    
    // 실제 참여자 수 계산
    const memberCount = await prisma.message.groupBy({
      by: ['userId'],
      where: { 
        roomId: room.id,
        userId: { not: null }
      },
      _count: { userId: true }
    });
    
    // 최근 활동한 사용자들 (온라인 상태 시뮬레이션)
    const recentUsers = await prisma.message.findMany({
      where: { 
        roomId: room.id,
        userId: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // 30분 이내
        }
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      },
      distinct: ['userId'],
      take: 10
    });
    
    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        tags: room.tags ?? [],
        rules: room.rules,
        createdAt: room.createdAt,
        memberCount: memberCount.length,
        recentUsers: recentUsers.map(m => ({
          id: m.user?.id,
          name: m.user?.name,
          avatar: m.user?.avatar,
          online: true // 최근 활동한 사용자는 온라인으로 표시
        }))
      },
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ message: "방 정보를 불러오는데 실패했습니다." }, { status: 500 });
  }
}
