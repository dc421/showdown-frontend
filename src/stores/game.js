// src/stores/game.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

export const useGameStore = defineStore('game', () => {
  const gameState = ref(null);
  const gameEvents = ref([]);

  // We removed 'const auth = useAuthStore()' from here.

  // src/stores/game.js

async function fetchGame(gameId) {
  const auth = useAuthStore();

  console.log('--- fetchGame called ---');
  console.log('Token from auth store:', auth.token); // <-- ADD THIS LOG

  if (!auth.token) {
    console.log('No token found, stopping fetch.');
    return;
  }

  try {
    const response = await fetch(`${auth.API_URL}/api/games/${gameId}`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch game data');

    const data = await response.json();
    gameState.value = data.gameState.state_data;
    gameEvents.value = data.gameEvents;

  } catch (error) {
    console.error(error);
  }
}

  return { gameState, gameEvents, fetchGame };
})