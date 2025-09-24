import { NextResponse } from "next/server";
import { likeComment } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string; postId: string; commentId: string }> };

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId, postId, commentId } = await params;
  try {
    const comment = likeComment(postId, commentId);
    if (!comment) {
      return NextResponse.json({ message: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }
    
    return NextResponse.json({
      ok: true,
      likes: comment.likes ?? 0
    });
  } catch (e) {
    return NextResponse.json({ message: "좋아요 처리 중 오류가 발생했습니다" }, { status: 500 });
  }
}


