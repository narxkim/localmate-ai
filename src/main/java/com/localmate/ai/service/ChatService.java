package com.localmate.ai.service;

import com.localmate.ai.dto.request.ChatRequest;
import com.localmate.ai.dto.response.ChatResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class ChatService {

    private final ChatClient chatClient;

    public ChatService(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    public ChatResponse chat(ChatRequest request) {
        String userPrompt = createUserPrompt(request);

        String answer = chatClient
                .prompt()
                .user(userPrompt)
                .advisors(advisor -> advisor.param(
                        ChatMemory.CONVERSATION_ID,
                        request.conversationId()
                ))
                .call()
                .content();

        return new ChatResponse(
                request.conversationId(),
                answer
        );
    }

    public Flux<String> stream(ChatRequest request) {
        String userPrompt = createUserPrompt(request);

        return chatClient
                .prompt()
                .user(userPrompt)
                .advisors(advisor -> advisor.param(
                        ChatMemory.CONVERSATION_ID,
                        request.conversationId()
                ))
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