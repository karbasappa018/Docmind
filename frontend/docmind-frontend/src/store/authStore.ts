import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserDto } from '../types';
import { authApi } from '../services/authApi';
import { conversationApi } from '../services/conversationApi';
import { useDocumentStore } from './documentStore';
import { useConversationStore } from './conversationStore';

interface AuthState {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<UserDto>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ username, password });
          set({
            user: response.user,
            token: response.accessToken,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const userDto = await authApi.register({ username, email, password });
          set({ isLoading: false });
          return userDto;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        const currentUser = get().user;
        if (currentUser?.id) {
          conversationApi.clearUserData(currentUser.id);
        }
        // Also clear any docmind:* keys in localStorage
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('docmind:') || key.startsWith('docmind-chats-') || key.startsWith('docmind-pref-'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch (e) {
          console.error('Error clearing localStorage on logout', e);
        }

        // Reset stores
        useDocumentStore.getState().reset();
        useConversationStore.getState().reset();

        set({ user: null, token: null, isLoading: false });
      },
    }),
    {
      name: 'docmind-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
