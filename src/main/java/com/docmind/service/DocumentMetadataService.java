package com.docmind.service;

import com.docmind.dto.DocumentMetadataDto;
import com.docmind.dto.DocumentResponseDto;
import com.docmind.entity.DocumentMetadata;
import com.docmind.entity.DocumentStatus;
import com.docmind.entity.User;
import com.docmind.exception.DocumentProcessingException;
import com.docmind.exception.ResourceNotFoundException;
import com.docmind.repository.DocumentMetadataRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentMetadataService {


    private static final Logger log = LoggerFactory.getLogger(DocumentMetadataService.class);

    private final DocumentMetadataRepo documentMetadataRepo;
    private final DocumentParserService parserService;
    private final DocumentIngestionService ingestionService;
    private final ModelMapper modelMapper;
    private final JdbcTemplate jdbcTemplate;


    //method to upload and parse document
    @Transactional
    public DocumentResponseDto uploadAndProcess(MultipartFile file, User user) {

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octat-stream";

        //document meta data create
        //storing the user detail with document metadata
        DocumentMetadata documentMetadata = DocumentMetadata
                .builder()
                .filename(fileName)
                .contentType(contentType)
                .status(DocumentStatus.UPLOADING)
                .fileSize(file.getSize())
                .createdAt(LocalDateTime.now())
                .user(user)
                .build();


        documentMetadata = documentMetadataRepo.save(documentMetadata);
        List<Document> parsedDocs = null;
        int chunksCreated = 0;

        try {
            //parse the file
            parsedDocs = parserService.parse(file);

            //ingest service
            chunksCreated = ingestionService.ingest(documentMetadata, parsedDocs);
        } catch (
                DocumentProcessingException e
        ) {
            log.info("Document metadata deleting due to fail processing");
            documentMetadataRepo.delete(documentMetadata);
            throw e;
        }


        //documentMetadata.setTotalChunks(chunksCreated);
        //save the document metadata


        return DocumentResponseDto.builder()
                .id(documentMetadata.getId())
                .fileName(documentMetadata.getFilename())
                .fileSize(documentMetadata.getFileSize())
                .chunksCreated(chunksCreated)
                .status(documentMetadata.getStatus())
                .message("Document successfully processed and indexed.")
                .userId(user.getId())
                .build();


    }

    public List<DocumentResponseDto> uploadMultipleDocuments(List<MultipartFile> files, User user) {


        List<DocumentResponseDto> responseDtos = new ArrayList<>();

        for (MultipartFile file : files) {
            DocumentResponseDto result = this.uploadAndProcess(file, user);
            responseDtos.add(result);
        }

        return responseDtos;


    }


    //    to get all the documents: This method is useful for admin
    public List<DocumentMetadataDto> getAllDocuments() {

        List<DocumentMetadata> allDocuments = documentMetadataRepo.findAllByOrderByCreatedAtDesc();
        return allDocuments.stream()
                .map(documentMetadata -> modelMapper.map(documentMetadata, DocumentMetadataDto.class))
                .toList();

    }

    public List<DocumentMetadataDto> getAllDocumentsByUser(User user) {
        List<DocumentMetadata> documents = documentMetadataRepo.findByUserOrderByCreatedAtDesc(user);
        return documents.stream()
                .map(documentMetadata -> modelMapper.map(documentMetadata, DocumentMetadataDto.class))
                .toList();
    }

    public DocumentMetadataDto getDocumentById(UUID id) {
        DocumentMetadata documentMetadata = documentMetadataRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));
        return modelMapper.map(documentMetadata, DocumentMetadataDto.class);


    }

    @Transactional
    public void deleteDocument(UUID id) {
        DocumentMetadata documentMetadata = documentMetadataRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));


        documentMetadataRepo.delete(documentMetadata);
        //delete the vector entries
        try {
            String deleteVectorsSql = "DELETE FROM vector_store WHERE metadata->>'documentId' = ?";
            int deletedCount = jdbcTemplate.update(deleteVectorsSql, id.toString());
            log.info("Deleted {} vector chunks for document id {} ", deletedCount, id);

        } catch (Exception e) {
            log.warn("cloud not delete vectors from vector store directly: {}", e.getMessage());
        }

    }
}
