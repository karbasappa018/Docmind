package com.docmind.service;


import com.docmind.config.AppProperties;
import com.docmind.entity.DocumentMetadata;
import com.docmind.entity.DocumentStatus;
import com.docmind.exception.DocumentProcessingException;
import com.docmind.repository.DocumentMetadataRepo;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DocumentIngestionService {

    private static final Logger log= LoggerFactory.getLogger(DocumentIngestionService.class);

    private  final VectorStore vectorStore;
    private final DocumentMetadataRepo documentMetadataRepo;
    private final AppProperties appProperties;

    public int ingest(DocumentMetadata metadata, List<Document> parsedDocs) {
        log.info("Ingesting document [id={}, name={}, pages={}]", metadata.getId(),metadata.getFilename(), metadata.getFileSize());

        try{

            metadata.setStatus(DocumentStatus.PROCESSING);
            metadata.setTotalPages(parsedDocs.size());

            //1. Text chunking using TokenTextSplitter

            TokenTextSplitter tokenTextSplitter= TokenTextSplitter.builder()
                    .withChunkSize(appProperties.getRag().getChunkSize())
                    .withMinChunkSizeChars(appProperties.getRag().getMinChunkSizeChars())
                    .withMinChunkLengthToEmbed(appProperties.getRag().getMinChunkLengthToEmbed())
                    .withMaxNumChunks(appProperties.getRag().getMaxNumChunks())
                    .withKeepSeparator(true)
                    .build();


            List<Document> chunks = tokenTextSplitter.apply(parsedDocs);
            if(chunks.isEmpty()){
                metadata.setStatus(DocumentStatus.FAILED);
                metadata.setErrorMessage("Document appears to be empty or unscannable");
                documentMetadataRepo.save(metadata);
                return 0;
            }


//            2. Meta data enrichment on each chunk
            List<Document> enrichedChunks = new ArrayList<>();
            for (int i = 0; i < chunks.size(); i++){
                Document chunk = chunks.get(i);
                Map<String, Object> enrichedMetadata = new HashMap<>(chunk.getMetadata());
                enrichedMetadata.put("documentId", metadata.getId().toString());
                enrichedMetadata.put("fileName", metadata.getFilename());
                enrichedMetadata.put("contentType", metadata.getContentType());
                enrichedMetadata.put("chunkIndex", i);
//                this step is very important for user based document
                enrichedMetadata.put("userId", metadata.getUser().getId().toString());
                // Preserve or calculate page number if available
                Object pageNumber = chunk.getMetadata().get("page_number");
                if (pageNumber == null) {
                    pageNumber = chunk.getMetadata().get("pageNumber");

                }

                if (pageNumber != null) {
                    enrichedMetadata.put("pageNumber", pageNumber);
                }
                Document enrichedDoc = new Document(chunk.getText(), enrichedMetadata);
                enrichedChunks.add(enrichedDoc);
            }


//            3. write chunks and embedding to pg vector
            log.info("Writing {} vector chunks to PgVectorStore for document: {}", enrichedChunks.size(), metadata.getFilename());
            vectorStore.add(enrichedChunks);

//            4. Update document status to index
            metadata.setStatus(DocumentStatus.INDEXED);
            metadata.setTotalChunks(enrichedChunks.size());
            metadata.setErrorMessage(null);
            documentMetadataRepo.save(metadata);
            log.info("Successfully indexed document [id={}, name={}, chunks={}]", metadata.getId(), metadata.getFilename(), enrichedChunks.size());

            return enrichedChunks.size();
        }catch (Exception ex){
            log.error("Failed to ingest document into vector store: {}", metadata.getFilename(), ex);
            metadata.setStatus(DocumentStatus.FAILED);
            metadata.setErrorMessage(ex.getMessage());
            documentMetadataRepo.save(metadata);
            throw new DocumentProcessingException("Failed to index document: " + ex.getMessage(), ex);
        }



    }
}
