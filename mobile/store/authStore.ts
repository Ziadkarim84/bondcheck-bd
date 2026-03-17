import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  name: string;
  email?: string;
  tier: 'free' | 'premium';
  language: 'bn' | 'en';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  language: 'bn' | 'en';
  isReady: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setLanguage: (lang: 'bn' | 'en') => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  language: 'bn',
  isReady: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, language: user.language });
  },

  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  hydrate: async () => {
    try {
      const [token, refresh, userStr] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('user'),
      ]);
      const user = userStr ? (JSON.parse(userStr) as User) : null;
      set({ accessToken: token, refreshToken: refresh, user, language: user?.language ?? 'bn' });
    } catch (e) {
      console.warn('[AuthStore] hydrate failed:', e);
    } finally {
      set({ isReady: true });
    }
  },

  setLanguage: (language) => set({ language }),
}));
