import { NextResponse } from "next/server";
import { recordAISync } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  
  try {
    const body = await req.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ message: "사용자 ID가 필요합니다." }, { status: 400 });
    }

    // Record AI sync timestamp
    recordAISync(roomId);
    
    console.log(`[AI SYNC] Recorded sync timestamp for room ${roomId} and user ${userId}`);

    return NextResponse.json({
      success: true,
      message: "AI 동기화 타임스탬프가 기록되었습니다."
    });

  } catch (e) {
    console.error('AI sync recording error:', e);
    return NextResponse.json({ 
      message: `AI 동기화 기록 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}` 
    }, { status: 500 });
  }
}
