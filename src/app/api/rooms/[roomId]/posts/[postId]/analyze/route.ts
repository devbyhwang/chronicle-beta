import { NextResponse } from "next/server";
import { getLLM } from "@/lib/ai/openai";
import { POST_ANALYSIS_JUDGMENT_PROMPT, POST_ANALYSIS_PROMPT } from "@/lib/ai/prompts";
import { getPost } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string; postId: string }> };

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId, postId } = await params;
  
  try {
    // Get the post
    const post = getPost(roomId, postId);
    
    if (!post) {
      return NextResponse.json({ message: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    // 1단계: 분석 가능 여부 판별
    const judgmentPrompt = POST_ANALYSIS_JUDGMENT_PROMPT(post.title, post.content);
    console.log(`[POST ANALYSIS] Judging post ${postId}: ${post.title}`);

    const llm = getLLM();
    const judgmentResponse = await llm.chat({
      messages: [
        { role: 'system', content: 'You are a critical content analyst. You must be extremely strict and critical when evaluating content. Do not be overly positive or lenient. Focus on identifying logical flaws, insufficient evidence, and areas that need improvement. Always respond in Korean.' },
        { role: 'user', content: judgmentPrompt }
      ]
    });
    
    console.log(`[POST ANALYSIS] Judgment response: ${judgmentResponse.substring(0, 200)}...`);

    // Parse judgment response
    let judgmentData;
    try {
      judgmentData = JSON.parse(judgmentResponse);
    } catch (e) {
      console.error('[POST ANALYSIS ERROR] Failed to parse judgment response:', e);
      return NextResponse.json({
        message: "AI 판별 결과를 파싱하는 중 오류가 발생했습니다."
      }, { status: 500 });
    }

    // 분석할 필요가 없는 경우
    if (!judgmentData.shouldAnalyze) {
      return NextResponse.json({
        success: false,
        shouldAnalyze: false,
        reason: judgmentData.reason,
        contentType: judgmentData.contentType,
        message: "이 게시글은 분석할 만한 내용이 아닙니다."
      });
    }

    // 2단계: 실제 분석 수행
    const analysisPrompt = POST_ANALYSIS_PROMPT(post.title, post.content);
    console.log(`[POST ANALYSIS] Analyzing post ${postId}: ${post.title}`);

    const analysisResponse = await llm.chat({
      messages: [
        { role: 'system', content: 'You are a critical content analyst. You must be extremely strict and critical when evaluating content. Do not be overly positive or lenient. Focus on identifying logical flaws, insufficient evidence, and areas that need improvement. Always respond in Korean.' },
        { role: 'user', content: analysisPrompt }
      ]
    });
    
    console.log(`[POST ANALYSIS] Analysis response: ${analysisResponse.substring(0, 200)}...`);

    // Parse analysis response
    let analysisData;
    try {
      analysisData = JSON.parse(analysisResponse);
    } catch (e) {
      console.error('[POST ANALYSIS ERROR] Failed to parse analysis response:', e);
      return NextResponse.json({
        message: "AI 분석 결과를 파싱하는 중 오류가 발생했습니다."
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shouldAnalyze: true,
      analysis: analysisData,
      postId: postId,
      postTitle: post.title
    });

  } catch (e) {
    console.error('Post analysis error:', e);
    return NextResponse.json({ 
      message: `게시글 분석 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}` 
    }, { status: 500 });
  }
}
