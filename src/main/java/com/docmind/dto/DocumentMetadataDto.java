package com.docmind.dto;

import com.docmind.entity.DocumentStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DocumentMetadataDto {


    private UUID id;
    private  String filename;
    private  String contentType;
    private  Long fileSize;
    private Integer totalPages;
    private  Integer totalChunks;
    private DocumentStatus status;
    private  String errorMessage;
    private LocalDateTime createdAt;
    private  LocalDateTime updatedAt;
}
