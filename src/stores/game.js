import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';
import router from '@/router';

export const useGameStore = defineStore('game', () => {
  const game = ref(null);
  const gameState = ref(null);
  const gameEvents = ref([]);
  const batter = ref(null);
  const pitcher = ref(null);
  const lineups = ref({ home: null, away: null });
  const rosters = ref({ home: [], away: [] });
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
      
      const allRosterPlayers = [...(data.rosters.home || []), ...(data.rosters.away || [])];
      const nameCounts = {};
      allRosterPlayers.forEach(p => { nameCounts[p.name] = (nameCounts[p.name] || 0) + 1; });
      const processPlayer = (p) => {
        if (!p) return;
        p.displayName = nameCounts[p.name] > 1 ? `${p.name} (${p.team})` : p.name;
        if (p.control !== null) {
          p.displayPosition = Number(p.ip) > 3 ? 'SP' : 'RP';
        } else {
          p.displayPosition = p.fielding_ratings ? Object.keys(p.fielding_ratings).join(',').replace(/LFRF/g, 'LF/RF') : 'DH';
        }
      };
      
      data.rosters.home.forEach(processPlayer);
      data.rosters.away.forEach(processPlayer);
      if (data.batter) processPlayer(data.batter);
      if (data.pitcher) processPlayer(data.pitcher);
      if (data.lineups.home?.battingOrder) data.lineups.home.battingOrder.forEach(spot => processPlayer(spot.player));
      if (data.lineups.away?.battingOrder) data.lineups.away.battingOrder.forEach(spot => processPlayer(spot.player));
      if (data.lineups.home?.startingPitcher) processPlayer(data.lineups.home.startingPitcher);
      if (data.lineups.away?.startingPitcher) processPlayer(data.lineups.away.startingPitcher);

      game.value = data.game;
      gameState.value = data.gameState.state_data;
      gameEvents.value = data.gameEvents;
      batter.value = data.batter;
      pitcher.value = data.pitcher;
      lineups.value = data.lineups;
      rosters.value = data.rosters;
    } catch (error) {
      console.error(error);
    }
  }

  async function setDefense(gameId, infieldIn) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/set-defense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({ infieldIn: infieldIn })
    });
  } catch (error) {
    console.error("Error setting defense:", error);
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
      console.error("Error in fetchGameSetup:", error);
    }
  }

  async function submitRoll(gameId) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
        await fetch(`${auth.API_URL}/api/games/${gameId}/roll`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify(setupData)
      });
      if (!response.ok) throw new Error('Failed to submit game setup');
    } catch (error) {
      console.error('Failed to submit setup:', error);
      alert(`Error: ${error.message}`);
    }
  }

  async function submitPitch(gameId, action = null) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/pitch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ action: action })
    });
  } catch (error) { console.error('Error submitting pitch:', error); }
}
  
  async function submitSwing(gameId, action = null) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/swing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ action: action })
    });
  } catch (error) { console.error('Error submitting swing:', error); }
}
  
  async function submitSubstitution(gameId, substitutionData) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
      const response = await fetch(`${auth.API_URL}/api/games/${gameId}/substitute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify(substitutionData)
      });
      if (!response.ok) throw new Error('Failed to make substitution');
    } catch (error) {
      console.error('Error making substitution:', error);
      alert(`Error: ${error.message}`);
    }
  }

  // --- ADD THIS MISSING ACTION ---
  async function advanceRunners(gameId, decisions) {
    const auth = useAuthStore();
    if (!auth.token) return;
    try {
      await fetch(`${auth.API_URL}/api/games/${gameId}/advance-runners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ decisions })
      });
      // Websocket event will trigger the update
    } catch (error) {
      console.error("Error advancing runners:", error);
    }
  }

  async function submitTagUp(gameId, decisions) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/tag-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ decisions })
    });
  } catch (error) {
    console.error("Error submitting tag up:", error);
  }
}

async function attemptSteal(gameId, fromBase) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/steal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ fromBase })
    });
  } catch (error) {
    console.error("Error attempting steal:", error);
  }
}

  return { game, gameState, gameEvents, batter, pitcher, lineups, rosters, setupState, 
    fetchGame, submitPitch, submitSwing, fetchGameSetup, submitRoll, submitGameSetup,submitTagUp,
    submitSubstitution, advanceRunners,setDefense,attemptSteal };
})