import { NextResponse } from "next/server";
import { getPost } from "@/lib/database";

type ParamsArg = { params: Promise<{ roomId: string; postId: string }> };

export async function GET(req: Request, { params }: ParamsArg) {
  const { roomId, postId } = await params;
  
  try {
    const post = await getPost(roomId, postId);
    
    if (!post) {
      return NextResponse.json({ message: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }
    
    // Convert Date to string for JSON serialization
    const postData = {
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author,
      createdAt: post.createdAt.toISOString(),
      views: post.views,
      likes: post.likes,
      comments: 0, // TODO: Add comment count
    };
    
    return NextResponse.json(postData);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ message: "게시글을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}