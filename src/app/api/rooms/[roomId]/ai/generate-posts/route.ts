import { NextResponse } from "next/server";
import { getLLM } from "@/lib/ai/openai";
import { CHAT_CONTENT_JUDGMENT_PROMPT, CHAT_TO_POST_PROMPT, CHAT_SUMMARY_PROMPT } from "@/lib/ai/prompts";
import { listMessages, createPost, recordAISync, getMessagesAfterLastSync, hasPreviousSync } from "@/lib/database";

type ParamsArg = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, { params }: ParamsArg) {
  const { roomId } = await params;
  
  try {
    const body = await req.json();
    const { userId, messageCount = 50 } = body;
    
    if (!userId) {
      return NextResponse.json({ message: "사용자 ID가 필요합니다." }, { status: 400 });
    }

    // Get all messages for debugging
    const allMessagesForDebug = await listMessages(roomId, { limit: 100 });
    console.log(`[AI DEBUG] Total messages in room ${roomId}: ${allMessagesForDebug.length}`);
    console.log(`[AI DEBUG] Messages by author:`, allMessagesForDebug.map(m => ({ author: m.author, text: m.text?.substring(0, 50) })));
    
    // Get user's messages after last AI sync
    const userMessages = await getMessagesAfterLastSync(roomId, userId);
    console.log(`[AI DEBUG] User messages for ${userId}: ${userMessages.length}`);
    
    if (userMessages.length === 0) {
      if (!hasPreviousSync(roomId)) {
        return NextResponse.json({ message: "해당 사용자의 메시지가 없습니다." }, { status: 400 });
      } else {
        return NextResponse.json({ message: "마지막 AI 동기화 이후 새로운 메시지가 없습니다." }, { status: 400 });
      }
    }

          const userMessagesText = userMessages.join('\n');

          const llm = getLLM();

          // 1단계: 내용 판단
          const judgmentPrompt = CHAT_CONTENT_JUDGMENT_PROMPT(userMessagesText, userId);
          console.log(`[AI DEBUG] Judgment prompt: ${judgmentPrompt.substring(0, 200)}...`);

          const judgmentResponse = await llm.chat(judgmentPrompt);
          console.log(`[AI DEBUG] Judgment response: ${judgmentResponse}`);

          // Parse judgment response
          let judgmentData;
          try {
            judgmentData = JSON.parse(judgmentResponse);
          } catch (e) {
            console.error('[AI ERROR] Failed to parse judgment response:', e);
            return NextResponse.json({
              message: "AI 내용 판단 중 오류가 발생했습니다."
            }, { status: 500 });
          }

          // 내용이 부족한 경우
          if (!judgmentData.hasContent) {
            return NextResponse.json({
              success: false,
              message: `게시글로 변환할 만한 내용이 부족합니다. (${judgmentData.reason})`,
              reason: judgmentData.reason,
              contentType: judgmentData.contentType
            }, { status: 200 });
          }

          console.log(`[AI JUDGMENT] Content approved: ${judgmentData.reason} (${judgmentData.contentType})`);

          // 2단계: 게시글 생성
          const postPrompt = CHAT_TO_POST_PROMPT(userMessagesText, userId);
          console.log(`[AI DEBUG] Post prompt: ${postPrompt.substring(0, 200)}...`);

          const postResponse = await llm.chat(postPrompt);
          console.log(`[AI DEBUG] Post response: ${postResponse.substring(0, 200)}...`);

          // Parse AI response
          let postData;
          try {
            postData = JSON.parse(postResponse);
          } catch (e) {
            // If JSON parsing fails, create a fallback post
            postData = {
              title: `[AI 생성] ${userId}님의 채팅 요약`,
              content: postResponse
            };
          }

          // 게시글은 생성하지 않고 미리보기용 데이터만 준비
          const previewPost = {
            title: postData.title || `[AI 생성] ${userId}님의 채팅 요약`,
            content: postData.content || postResponse
          };

          console.log(`[AI PREVIEW] Generated preview post: ${previewPost.title}`);

          // AI sync timestamp는 사용자가 실제로 게시글을 등록할 때 기록

    // Generate room summary from all messages
    const allMessagesForSummary = listMessages(roomId, { limit: 50 });
    const allChatText = allMessagesForSummary
      .map(msg => `${msg.author}: ${msg.text}`)
      .join('\n');
    const summaryPrompt = CHAT_SUMMARY_PROMPT(allChatText);
    const summaryResponse = await llm.chat(summaryPrompt);

    return NextResponse.json({
      success: true,
      post: previewPost,
      summary: summaryResponse,
      messageCount: userMessages.length
    });

  } catch (e) {
    console.error('AI post generation error:', e);
    console.error('Error details:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ 
      message: `AI 게시글 생성 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}` 
    }, { status: 500 });
  }
}
