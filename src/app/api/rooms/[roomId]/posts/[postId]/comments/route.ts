import { NextResponse } from "next/server";
import { createComment, listComments } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string; postId: string }> };

export async function GET(req: Request, { params }: ParamsArg) {
  const { roomId, postId } = await params;
  const comments = listComments(postId);
  return NextResponse.json({ 
    roomId, 
    postId, 
    comments: comments.map(c => ({
      id: c.id,
      postId: c.postId,
      roomId: c.roomId,
      parentId: c.parentId,
      content: c.content,
      author: c.author,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      likes: c.likes ?? 0,
      isDeleted: c.isDeleted ?? false,
    }))
  });
}

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId, postId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const content = String(body?.content || "").trim();
    const author = String(body?.author || "anon").trim();
    const parentId = body?.parentId ? String(body.parentId) : undefined;
    
    if (content.length < 1) {
      return NextResponse.json({ message: "댓글 내용을 입력해주세요" }, { status: 400 });
    }
    
    const comment = createComment(roomId, postId, { content, author, parentId });
    return NextResponse.json({ 
      ok: true, 
      comment: {
        id: comment.id,
        postId: comment.postId,
        roomId: comment.roomId,
        parentId: comment.parentId,
        content: comment.content,
        author: comment.author,
        createdAt: comment.createdAt,
        likes: comment.likes ?? 0,
        isDeleted: comment.isDeleted ?? false,
      }
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: "댓글 작성 중 오류가 발생했습니다" }, { status: 500 });
  }
}


