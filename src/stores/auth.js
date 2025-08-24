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
  const myGames = ref([]); // <-- ADD NEW STATE
  const activeRosterCards = ref([]); // <-- ADD THIS
  const openGames = ref([]); // <-- ADD NEW STATE

  
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
    const players = await response.json();

    // ADD THIS LINE TO INSPECT THE RAW DATA
    console.log('RAW PLAYER DATA FROM SERVER:', players);

    const nameCounts = {};
    players.forEach(p => { nameCounts[p.name] = (nameCounts[p.name] || 0) + 1; });

    players.forEach(p => {
      p.displayName = nameCounts[p.name] > 1 ? `${p.name} (${p.team})` : p.name;

      // CORRECTED LOGIC: Check if 'control' is not null
      if (p.control !== null) { 
        p.displayPosition = Number(p.ip) > 3 ? 'SP' : 'RP';
      } else {
        p.displayPosition = p.positions ? p.positions.replace(/LFRF/g, 'LF/RF') : 'Util';
      }
    });

    allPlayers.value = players;
  } catch (error) {
    console.error('Failed to fetch players:', error);
  }
}

  // ADD THIS ACTION
  // In src/stores/auth.js
async function fetchRosterDetails(rosterId) {
  if (!token.value) return;
  try {
    const response = await fetch(`${API_URL}/api/rosters/${rosterId}`, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    });
    if (!response.ok) throw new Error('Failed to fetch roster details');
    const rosterPlayers = await response.json();

    // --- ADD THIS PROCESSING LOGIC ---
    rosterPlayers.forEach(p => {
      if (p.control !== null) {
        p.displayPosition = Number(p.ip) > 3 ? 'SP' : 'RP';
      } else {
        p.displayPosition = p.positions ? p.positions.replace(/LFRF/g, 'LF/RF') : 'Util';
      }
    });

    activeRosterCards.value = rosterPlayers;
  } catch (error) {
    console.error(error);
  }
}

  // ADD THIS ACTION
  async function fetchOpenGames() {
    if (!token.value) return;
    try {
      const response = await fetch(`${API_URL}/api/games/open`, {
        headers: { 'Authorization': `Bearer ${token.value}` }
      });
      if (!response.ok) throw new Error('Failed to fetch open games');
      openGames.value = await response.json();
    } catch (error) {
      console.error(error);
    }
  }

  // ADD THIS ACTION
  async function joinGame(gameId, rosterId) {
    if (!token.value) return;
    try {
      const response = await fetch(`${API_URL}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`
        },
        body: JSON.stringify({ roster_id: rosterId })
      });
      if (!response.ok) throw new Error('Failed to join game');
      // Refresh both game lists after joining
      await fetchMyGames();
      await fetchOpenGames();
    } catch (error) {
       console.error(error);
       alert(`Error: ${error.message}`);
    }
  }
  
  // ADD THIS ACTION
  async function submitLineup(gameId, lineupData) {
    if (!token.value) return;
    try {
      await fetch(`${API_URL}/api/games/${gameId}/lineup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`
        },
        body: JSON.stringify(lineupData)
      });
      // After submitting, refresh the games list and go to the dashboard
      await fetchMyGames();
      router.push(`/game/${gameId}`);
    } catch (error) {
      console.error('Failed to submit lineup:', error);
      alert('Error submitting lineup.');
    }
  }

  // ADD THIS ACTION
async function register(credentials) {
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        alert('Registration successful! Please log in.');
        router.push('/login'); // Redirect to login page after registration
    } catch (error) {
        console.error('Registration failed:', error);
        alert(`Registration Failed: ${error.message}`);
    }
}


  // ADD THIS NEW ACTION
  async function fetchMyGames() {
    if (!token.value) return;
    try {
      const response = await fetch(`${API_URL}/api/games`, {
        headers: { 'Authorization': `Bearer ${token.value}` }
      });
      if (!response.ok) throw new Error('Failed to fetch games');
      myGames.value = await response.json();
    } catch (error) {
      console.error(error);
    }
  }

  // ADD THIS NEW ACTION
  async function createGame(rosterId) {
    if (!token.value) return;
    try {
      const response = await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`
        },
        // For simplicity, we'll just default to home/AL
        body: JSON.stringify({ roster_id: rosterId, home_or_away: 'home', league_designation: 'AL' })
      });
      if (!response.ok) throw new Error('Failed to create game');
      await fetchMyGames(); // Refresh the games list
    } catch (error) {
       console.error(error);
       alert(`Error: ${error.message}`);
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
    token, user, rosters, allPlayers, myGames, // <-- add myGames
    isAuthenticated, login, logout, fetchRosters, 
    fetchAllPlayers, createRoster, API_URL, router,
    activeRosterCards, fetchRosterDetails, submitLineup,
    openGames, fetchOpenGames, joinGame,register,
    fetchMyGames, createGame // <-- add fetchMyGames, createGame
  }
})