package com.docmind.service;

import com.docmind.entity.ChatMessage;
import com.docmind.entity.Conversation;
import com.docmind.entity.MessageType;
import com.docmind.repository.ChatMessageRepository;
import com.docmind.repository.ConversationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class JpaChatMemory implements ChatMemory {

    private final ChatMessageRepository chatMessageRepository;
    private final ConversationRepository conversationRepository;

    @Transactional
    @Override
    public void add(String conversationId, List<Message> messages) {

        if (messages == null || messages.isEmpty()) {
            return;
        }


//        get or create a new conversation

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseGet(() -> {
                    log.warn("Conversation {} not found when adding messages. Creating placeholder.", conversationId);
                    return conversationRepository.save(
                            Conversation.builder()
                                    .id(conversationId)
                                    .title("New Conversation")
                                    .createdAt(LocalDateTime.now())
                                    .updatedAt(LocalDateTime.now())
                                    .build()
                    );
                });


        for (Message msg : messages) {
            MessageType type = switch (msg.getMessageType()) {
                case USER -> MessageType.USER;
                case ASSISTANT -> MessageType.ASSISTANT;
                case SYSTEM -> MessageType.SYSTEM;
                default -> MessageType.USER;
            };


            ChatMessage chatMessage = ChatMessage.builder()
                    .conversation(conversation)
                    .messageType(type)
                    .content(msg.getText())
                    .createdAt(LocalDateTime.now())
                    .build();


            chatMessageRepository.save(chatMessage);


        }

        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);


    }

    @Override
    @Transactional(readOnly = true)
    public List<Message> get(String conversationId) {

        List<ChatMessage> all = chatMessageRepository.findLastNMessages(conversationId,10);
        if (all.isEmpty()) {
            return Collections.emptyList();
        }

        all.sort(Comparator.comparing(ChatMessage::getCreatedAt));


        List<Message> springAIMessages = new ArrayList<>();
        for (ChatMessage chatMessage : all) {
            switch (chatMessage.getMessageType()) {
                case USER -> springAIMessages.add(new UserMessage(chatMessage.getContent()));
                case ASSISTANT -> springAIMessages.add(new AssistantMessage(chatMessage.getContent()));
                case SYSTEM -> springAIMessages.add(new SystemMessage(chatMessage.getContent()));
            }
        }

        return springAIMessages;


    }

    @Override
    public void clear(String conversationId) {
        chatMessageRepository.deleteByConversation_Id(conversationId);

    }
}
