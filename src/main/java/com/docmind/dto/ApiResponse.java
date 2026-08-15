package com.docmind.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApiResponse<T> {

    private  Boolean success;
    private String message;
    private T data;
    private LocalDateTime timestamp;

}
