// src/stores/game.js - DEFINITIVE FINAL VERSION
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

export const useGameStore = defineStore('game', () => {
  const game = ref(null);
  const gameState = ref(null);
  const gameEvents = ref([]);
  const batter = ref(null);
  const pitcher = ref(null);
  const lineups = ref({ home: [], away: [] });
  const setupState = ref(null);


  async function fetchGame(gameId) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
      const response = await fetch(`${auth.API_URL}/api/games/${gameId}`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch game data');
      
      const data = await response.json();
      game.value = data.game;
      gameState.value = data.gameState.state_data;
      gameEvents.value = data.gameEvents;
      batter.value = data.batter;
      pitcher.value = data.pitcher;
      lineups.value = data.lineups;

    } catch (error) {
      console.error(error);
    }
  }

  async function submitPitch(gameId) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
      await fetch(`${auth.API_URL}/api/games/${gameId}/pitch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
    } catch (error) { console.error('Error submitting pitch:', error); }
  }
  
  async function submitSwing(gameId) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
      await fetch(`${auth.API_URL}/api/games/${gameId}/swing`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
    } catch (error) { console.error('Error submitting swing:', error); }
  }

  async function playTurn(gameId) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
      const response = await fetch(`${auth.API_URL}/api/games/${gameId}/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ action: 'swing' })
      });

      if (!response.ok) throw new Error('Failed to play turn');
      
      const data = await response.json();
      // Update the state with the results of the turn
      gameState.value = data.newGameState;
      gameEvents.value.push({
        turn_number: gameState.value.inning, // Simplified for log display
        log_message: data.log
      });
      // Fetch the main game object again to get the new current_turn_user_id
      await fetchGame(gameId);
      
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    }
  }

  async function fetchGameSetup(gameId) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    const response = await fetch(`${auth.API_URL}/api/games/${gameId}/setup`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch setup');
    setupState.value = await response.json();
  } catch (error) {
    console.error(error);
  }
}
async function submitPitch(gameId) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
      await fetch(`${auth.API_URL}/api/games/${gameId}/pitch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
    } catch (error) { console.error('Error submitting pitch:', error); }
  }
  async function submitSwing(gameId) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
      await fetch(`${auth.API_URL}/api/games/${gameId}/swing`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
    } catch (error) { console.error('Error submitting swing:', error); }
  }

  // ADD THIS NEW ACTION
async function submitRoll(gameId) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
        await fetch(`${auth.API_URL}/api/games/${gameId}/roll`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        // We don't need to do anything here; the WebSocket event will trigger the update
    } catch (error) {
        console.error('Error submitting roll:', error);
    }
}
  async function submitGameSetup(gameId, setupData) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    const response = await fetch(`${auth.API_URL}/api/games/${gameId}/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify(setupData)
    });
    if (!response.ok) throw new Error('Failed to submit game setup');
    
    // On success, we no longer need to do anything here.
    // The WebSocket event will trigger the redirect for both players.

  } catch (error) {
    console.error('Failed to submit setup:', error);
    alert(`Error: ${error.message}`);
  }
}

  return { game, gameState, gameEvents, batter, pitcher, lineups, setupState, fetchGame, fetchGameSetup, submitRoll, submitGameSetup, submitPitch, submitSwing };
})