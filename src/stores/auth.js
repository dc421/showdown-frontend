// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const rosters = ref([])
  const allPlayers = ref([]) // <-- ADD NEW STATE

  
  const API_URL = import.meta.env.VITE_API_URL;

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!token.value)

  // --- ACTIONS ---
  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUser(newUser) {
    user.value = newUser;
    localStorage.setItem('user', JSON.stringify(newUser));
  }

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
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      alert(`Login Failed: ${error.message}`);
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    rosters.value = []; // Clear rosters on logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  async function fetchRosters() {
    if (!token.value) return;
    try {
      const response = await fetch(`${API_URL}/api/rosters`, {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch rosters');
      rosters.value = await response.json();
    } catch (error) {
      console.error('Failed to fetch rosters:', error);
    }
  }

  async function fetchAllPlayers() {
    if (!token.value) return;
    try {
      const response = await fetch(`${API_URL}/api/cards/player`, {
        headers: { 'Authorization': `Bearer ${token.value}` }
      });
      if (!response.ok) throw new Error('Failed to fetch player cards');
      allPlayers.value = await response.json();
    } catch (error) {
      console.error(error);
    }
  }

  // ADD THIS NEW ACTION
  async function createRoster(rosterData) {
    if (!token.value) return;
    try {
      const response = await fetch(`${API_URL}/api/rosters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`
        },
        body: JSON.stringify(rosterData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
      // After successfully creating a roster...
      await fetchRosters(); // Refresh the user's roster list
      router.push('/dashboard'); // Navigate back to the dashboard
    } catch (error) {
      console.error('Failed to create roster:', error);
      alert(`Error: ${error.message}`);
    }
  }

  // ADD createRoster to the return object
  return { 
    token, user, rosters, allPlayers,
    isAuthenticated, login, logout, fetchRosters, 
    fetchAllPlayers, createRoster, 
    API_URL
  }
})