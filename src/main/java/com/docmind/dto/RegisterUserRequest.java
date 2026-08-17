package com.docmind.dto;

public record RegisterUserRequest(
        String username,
        String email,
        String password
) {
}
