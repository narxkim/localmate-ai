package com.localmate.ai.service;

import com.localmate.ai.dto.request.ChatRequest;
import com.localmate.ai.dto.response.ChatResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class ChatService {

    private final ChatClient chatClient;

    public ChatService(ChatClient.Builder builder) {
        this.chatClient = builder
                .defaultSystem("""
                        You are LocalMate AI, a travel concierge specializing
                        in Busan and Gyeongju, South Korea.

                        Follow these rules:
                        1. Provide practical travel information for foreign tourists.
                        2. Consider transportation, food, culture, and travel etiquette.
                        3. Do not invent places or factual information.
                        4. Clearly state when information cannot be verified.
                        5. Ask for additional conditions when the request is unclear.
                        6. Respond in the language specified by the user.
                        """)
                .build();
    }

    public ChatResponse chat(ChatRequest request) {
        String userPrompt = createUserPrompt(request);

        String answer = chatClient
                .prompt()
                .user(userPrompt)
                .call()
                .content();

        return new ChatResponse(request.conversationId(), answer);
    }

    public Flux<String> stream(ChatRequest request) {
        String userPrompt = createUserPrompt(request);

        return chatClient
                .prompt()
                .user(userPrompt)
                .stream()
                .content();
    }

    private String createUserPrompt(ChatRequest request) {
        return """
                Selected region: %s
                Response language: %s

                User question:
                %s
                """.formatted(
                request.region(),
                request.language(),
                request.message()
        );
    }
}