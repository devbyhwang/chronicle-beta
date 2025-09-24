import { NextResponse } from "next/server";
import { addMessage, listMessages } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function GET(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || "50");
  const cursorParam = url.searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : undefined;
  const messages = listMessages(roomId, { limit, cursor }).map((m) => ({
    id: m.id,
    text: m.text ?? m.summary ?? "",
    author: m.author ?? (m.kind === "ai" ? "ai" : "system"),
    createdAt: m.createdAt,
    seq: m.seq,
  }));
  const nextCursor = messages.length > 0 ? messages[messages.length - 1].seq : undefined;
  return NextResponse.json({ roomId, messages, nextCursor });
}

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    if (!text) return NextResponse.json({ message: "메시지를 입력하세요." }, { status: 400 });
    const msg = addMessage(roomId, { text, author: body?.author || "anon", kind: "user" });
    return NextResponse.json({ ok: true, roomId, id: msg.id, seq: msg.seq }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
