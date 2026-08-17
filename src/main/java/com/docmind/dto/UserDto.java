package com.docmind.dto;

import com.docmind.entity.Role;

public record UserDto(
        Long id,
        String username,
        String email,
        Role role
) {
}
