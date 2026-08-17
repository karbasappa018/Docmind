package com.docmind.controller;


import com.docmind.dto.ApiResponse;
import com.docmind.dto.DocumentMetadataDto;
import com.docmind.dto.DocumentResponseDto;
import com.docmind.entity.User;
import com.docmind.service.DocumentMetadataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController()
@RequestMapping("/api/v1/documents")
@Tag(
        name = "Document Management",
        description = "Endpoints for uploading, listing and managing documents and their vectors embeddings."
)
@RequiredArgsConstructor
public class DocumentController {


    private final DocumentMetadataService documentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload and index a document(PDF, DOCX, TEXT, MD, CSV)",
            description = "This api is used to upload and index documents files."

    )
    public ResponseEntity<ApiResponse<DocumentResponseDto>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            Authentication authentication

    ) {

        log.info("document uploading started:");
        User user = (User) authentication.getPrincipal();
//        System.out.println(user.getUsername());
//        System.out.println(user.getEmail());
//        System.out.println(user.getId());
//



//        process the files
        DocumentResponseDto documentResponseDto = this.documentService.uploadAndProcess(file,user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<DocumentResponseDto>builder()
                        .success(true)
                        .data(documentResponseDto)
                        .timestamp(LocalDateTime.now())
                        .message("Documents uploaded and indexed successfully")
                        .build());
    }


    //    api to upload multiple documents
    @PostMapping(value = "/upload-multiple", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload and index multiple documents simultaneously",
            description = "This api is used to upload and index multiple documents."
    )
    public ResponseEntity<ApiResponse<List<DocumentResponseDto>>> uploadMultiple(
            @RequestParam("files")
            List<MultipartFile> files,
            Authentication authentication
    ) {

        User user=(User)authentication.getPrincipal();
        List<DocumentResponseDto> responseDtos = documentService.uploadMultipleDocuments(files,user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        ApiResponse.<List<DocumentResponseDto>>
                                        builder()
                                .message("Document uploaded successfully")
                                .success(true)
                                .timestamp(LocalDateTime.now())
                                .data(responseDtos)
                                .build()
                );
    }




    //    list all uploaded documents of logged in user
    @GetMapping("/user")
    @Operation(summary = "List all uploaded documents and their indexing status of the logged user")
    public ResponseEntity<ApiResponse<List<DocumentMetadataDto>>> getAllDocumentOfLoggedInUser(
            Authentication authentication
    ){
        User user=(User)authentication.getPrincipal();
        java.util.List<DocumentMetadataDto> documents =documentService.getAllDocumentsByUser(user);
        return ResponseEntity.ok(
                ApiResponse.<List<DocumentMetadataDto>>
                                builder()
                        .message("All documents is here")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(documents)
                        .build()
        );
    }


    //    list all uploaded documents
//    Method for admin
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    @Operation(summary = "List all uploaded documents and their indexing status")
    public ResponseEntity<ApiResponse<List<DocumentMetadataDto>>> getAllDocuments(){
        java.util.List<DocumentMetadataDto> documents =documentService.getAllDocuments();
        return ResponseEntity.ok(
                ApiResponse.<List<DocumentMetadataDto>>
                                builder()
                        .message("All documents is here")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(documents)
                        .build()
        );
    }


    @GetMapping("/{id}")
    @Operation(summary = "Get metadata of a specific document by ID")
    public ResponseEntity<ApiResponse<DocumentMetadataDto>> getDocumentById(@PathVariable UUID id) {
        DocumentMetadataDto document = documentService.getDocumentById(id);
        return ResponseEntity.ok(
                ApiResponse.<DocumentMetadataDto>
                                builder()
                        .message("Single document is here")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(document)
                        .build()
        );
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a document and purge its vector embeddings from vector store")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable UUID id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(
                ApiResponse.<Void>
                                builder()
                        .message("Document deleted successfully")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(null)
                        .build()
        );
    }

}
