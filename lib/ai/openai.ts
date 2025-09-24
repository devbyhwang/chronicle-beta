// LLM client for OpenAI API
export function getLLM() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not found, using mock responses');
    return {
      async chat(prompt: string) {
        return `Mock AI response to: ${prompt}`;
      },
    };
  }

  return {
    async chat(promptOrMessages: string | { messages: Array<{ role: string; content: string }> }) {
      try {
        let messages: Array<{ role: string; content: string }>;
        
        if (typeof promptOrMessages === 'string') {
          // 기존 방식: 문자열 프롬프트
          messages = [
            { role: 'system', content: 'You are Chronicle\'s AI assistant specialized in converting user chat messages into posts. Your job is to transform the user\'s actual words into a post format without adding any new information, interpretations, or content that the user did not say. You must preserve the user\'s exact writing style, tone, and expressions. Do not add explanations, conclusions, or additional details that the user did not mention. For the title, create a natural, engaging title that the user would write themselves when posting to a community board - avoid summary-like titles or AI-generated phrases. Always respond in Korean.' },
            { role: 'user', content: promptOrMessages }
          ];
        } else {
          // 새로운 방식: 메시지 배열
          messages = promptOrMessages.messages;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages,
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'AI 응답을 생성할 수 없습니다.';
      } catch (error) {
        console.error('OpenAI API error:', error);
        return `AI 서비스 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      }
    },
  };
}

