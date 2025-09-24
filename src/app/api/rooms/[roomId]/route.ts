import { NextResponse } from "next/server";
import { getRoom } from "@/lib/database";
import { prisma } from "@/lib/db";
import { getOnlineUsers } from "@/lib/redis";

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
    
    // 실제 온라인 사용자들 (Redis에서 가져오기)
    const onlineUsers = await getOnlineUsers(room.id);
    
    // 최근 활동한 사용자들 (데이터베이스에서 가져오기)
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
    
    // 온라인 사용자와 최근 사용자 결합
    const combinedUsers = recentUsers.map(m => ({
      id: m.user?.id,
      name: m.user?.name,
      avatar: m.user?.avatar,
      online: onlineUsers.some(ou => ou.userId === m.user?.id)
    }));
    
    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        tags: room.tags ?? [],
        rules: room.rules,
        createdAt: room.createdAt,
        memberCount: memberCount.length,
        recentUsers: combinedUsers
      },
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ message: "방 정보를 불러오는데 실패했습니다." }, { status: 500 });
  }
}
