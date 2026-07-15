package com.localmate.ai.dto.request;

public record ChatRequest(
        String conversationId,      // 대화 구분 및 Chat Memory 연결
        String region,              // 부산·경주 중 상담 지역
        String language,            // AI가 답변할 언어
        String message              // 사용자의 질문
) {
}
