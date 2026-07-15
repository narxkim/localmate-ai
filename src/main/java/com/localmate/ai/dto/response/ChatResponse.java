package com.localmate.ai.dto.response;

public record ChatResponse(
        String conversationId,  // 어떤 대화에 대한 응답인지 식별
        String answer           // Gemini가 생성한 최종 답변
) {
}
