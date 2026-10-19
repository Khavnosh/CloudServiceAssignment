import { defineStore } from 'pinia';
import api from '../api/client.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    async login(username, password) {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data.data;
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    async fetchProfile() {
      const res = await api.get('/auth/me');
      this.user = res.data.data;
      localStorage.setItem('user', JSON.stringify(this.user));
    },
  },
});
