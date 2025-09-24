import { NextResponse } from "next/server";
import { getLLM } from "@/lib/ai/openai";
import { ROOM_QUALITY_ANALYSIS_PROMPT } from "@/lib/ai/prompts";
import { listPosts } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  
  try {
    // Get all posts in the room
    const posts = listPosts(roomId, { limit: 50 });
    
    if (posts.length === 0) {
      return NextResponse.json({ 
        message: "분석할 게시글이 없습니다." 
      }, { status: 400 });
    }

    // Prepare posts data for analysis (제목과 내용만 포함)
    const postsData = posts.map(post => ({
      title: post.title,
      content: post.content
    }));

    console.log(`[ROOM LEVEL] Analyzing room ${roomId} with ${posts.length} posts`);

    // Analyze room quality
    const analysisPrompt = ROOM_QUALITY_ANALYSIS_PROMPT(postsData);
    const llm = getLLM();
    
    const analysisResponse = await llm.chat({
      messages: [
        { role: 'system', content: 'You are an objective room quality analyst. You must be extremely strict and critical when evaluating content quality. Focus only on the actual content value, logical structure, and practical applicability. Do not consider author information or posting dates. Apply very high standards - only truly valuable, well-structured, and substantive content should receive high scores. Be objective and unbiased. Always respond in Korean.' },
        { role: 'user', content: analysisPrompt }
      ]
    });
    
    console.log(`[ROOM LEVEL] Analysis response: ${analysisResponse.substring(0, 200)}...`);

    // Parse AI response
    let analysisData;
    try {
      analysisData = JSON.parse(analysisResponse);
    } catch (e) {
      console.error('[ROOM LEVEL ERROR] Failed to parse analysis response:', e);
      return NextResponse.json({
        message: "AI 분석 결과를 파싱하는 중 오류가 발생했습니다."
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      roomId: roomId,
      postCount: posts.length,
      analysis: analysisData
    });

  } catch (e) {
    console.error('Room level analysis error:', e);
    return NextResponse.json({ 
      message: `방 수준 분석 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}` 
    }, { status: 500 });
  }
}
