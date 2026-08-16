package com.docmind.dto;

public record LoginResponse(
        String accessToken,
        UserDto user
) {
}
