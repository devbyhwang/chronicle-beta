import { NextResponse } from "next/server";
import { incrementPostViews } from "@/lib/database";

type ParamsArg = { params: Promise<{ roomId: string; postId: string }> };

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId, postId } = await params;
  
  try {
    await incrementPostViews(roomId, postId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error incrementing post views:', error);
    return NextResponse.json({ message: "조회수 증가 중 오류가 발생했습니다." }, { status: 500 });
  }
}


