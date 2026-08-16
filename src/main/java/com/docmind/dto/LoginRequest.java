package com.docmind.dto;

public record LoginRequest(
        String username,
        String password
) {
}
