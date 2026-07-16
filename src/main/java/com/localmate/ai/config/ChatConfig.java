package com.localmate.ai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatConfig {

    @Bean
    public ChatClient chatClient(
            ChatClient.Builder builder,
            ChatMemory chatMemory
    ){
        return builder.defaultSystem("""
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
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
    }
}
