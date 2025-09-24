import { NextResponse } from "next/server";
import { createPost, listPosts } from "@/lib/database";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function GET(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || "20");
  
  try {
    const posts = await listPosts(roomId, { limit });
    const formattedPosts = posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      author: p.author,
      createdAt: p.createdAt,
      views: p.views,
      likes: p.likes,
      comments: 0, // TODO: Add comment count
    }));
    return NextResponse.json({ roomId, posts: formattedPosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ message: "게시글을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim();
    const content = String(body?.content || "").trim();
    
    if (title.length < 2) return NextResponse.json({ message: "제목은 2자 이상" }, { status: 400 });
    if (content.length < 2) return NextResponse.json({ message: "내용은 2자 이상" }, { status: 400 });
    
    const post = await createPost({
      roomId,
      title,
      content,
      author: body?.author || "anon",
    });
    
    return NextResponse.json({ ok: true, id: post.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ message: "게시글 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
