import api from './api';
import type { LoginRequest, LoginResponse, RegisterRequest, UserDto } from '../types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  register: async (payload: RegisterRequest): Promise<UserDto> => {
    const { data } = await api.post<UserDto>('/auth/register', payload);
    return data;
  },
};
