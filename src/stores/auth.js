// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// CHANGE #1: Import the router instance directly instead of the composable
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)

  // CHANGE #2: We no longer need this line
  // const router = useRouter() 

  const API_URL = 'https://showdown-backend.onrender.com';

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUser(newUser) {
    user.value = newUser;
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  const isAuthenticated = computed(() => !!token.value)

  async function login(email, password) {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setToken(data.token);
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      setUser({ username: payload.username, userId: payload.userId });

      console.log('Login successful, navigating to dashboard...');
      // This line will now work correctly
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      alert(`Login Failed: ${error.message}`);
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  return { token, user, login, logout, isAuthenticated }
})