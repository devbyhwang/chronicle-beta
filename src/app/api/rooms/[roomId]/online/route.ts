import { NextResponse } from "next/server";
import { setUserOnline, getUserOnlineStatus } from "@/lib/redis";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, { params }: ParamsArg) {
  try {
    const { roomId } = await params;
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    
    if (!userId) {
      return NextResponse.json({ message: "사용자 ID가 필요합니다." }, { status: 400 });
    }
    
    const success = await setUserOnline(userId, roomId);
    
    if (success) {
      return NextResponse.json({ ok: true, online: true });
    } else {
      return NextResponse.json({ message: "온라인 상태 설정에 실패했습니다." }, { status: 500 });
    }
  } catch (error) {
    console.error('Error setting user online:', error);
    return NextResponse.json({ message: "온라인 상태 설정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: ParamsArg) {
  try {
    const { roomId } = await params;
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ message: "사용자 ID가 필요합니다." }, { status: 400 });
    }
    
    const isOnline = await getUserOnlineStatus(userId, roomId);
    
    return NextResponse.json({ online: isOnline });
  } catch (error) {
    console.error('Error checking user online status:', error);
    return NextResponse.json({ message: "온라인 상태 확인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
