import { NextResponse } from "next/server";
import { createMessage, listMessages } from "@/lib/database";
import { prisma } from "@/lib/db";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function GET(req: Request, { params }: ParamsArg) {
  try {
    const { roomId } = await params;
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    
    const messages = await listMessages(roomId, { limit });
    const messagesWithUserInfo = await Promise.all(
      messages.map(async (m) => {
        let userInfo = null;
        if (m.userId) {
          userInfo = await prisma.user.findUnique({
            where: { id: m.userId },
            select: { name: true, avatar: true }
          });
        }
        
        return {
          id: m.id,
          text: m.text,
          author: userInfo?.name || m.author,
          avatar: userInfo?.avatar,
          userId: m.userId,
          createdAt: m.createdAt,
        };
      })
    );
    
    return NextResponse.json({ roomId, messages: messagesWithUserInfo });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ message: "메시지를 불러오는데 실패했습니다." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: ParamsArg) {
  try {
    const { roomId } = await params;
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    const author = String(body?.author || "익명").trim();
    const userId = body?.userId || null;
    
    if (!text) {
      return NextResponse.json({ message: "메시지를 입력하세요." }, { status: 400 });
    }
    
    const message = await createMessage({
      roomId,
      text,
      author,
      userId,
    });
    
    return NextResponse.json({ 
      ok: true, 
      roomId, 
      id: message.id,
      author: message.author,
      createdAt: message.createdAt
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ message: "메시지 전송 중 오류가 발생했습니다." }, { status: 500 });
  }
}
