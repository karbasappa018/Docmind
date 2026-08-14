package com.docmind.config;

import jakarta.websocket.server.ServerEndpoint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {

    private RagProperties rag = new RagProperties();
    private CorsProperties cors = new CorsProperties();


    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CorsProperties {
        private String allowedOrigins = "*";
        private String allowedMethods = "GET,POST,PUT,DELETE,OPTIONS";
        private String allowedHeaders = "*";
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RagProperties {
        private int chunkSize = 600;
        private  int minChunkSizeChars=350;
        private  int minChunkLengthToEmbed=5;
        private  int maxNumChunks=10000;
//        private int chunkOverlap = 100;
        private int topK = 5;
        private double similarityThreshold = 0.0;
    }
}
