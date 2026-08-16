package com.docmind.dto;

import com.docmind.entity.DocumentStatus;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DocumentResponseDto {
    private UUID id;
    private   String fileName;
    private  Long fileSize;
    private DocumentStatus status;
    private  Integer chunksCreated;
    private  String message;
    private Long userId;
}
