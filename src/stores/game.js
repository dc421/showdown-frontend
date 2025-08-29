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

  // in src/stores/game.js
async function submitBaserunningDecisions(gameId, decisions) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/submit-decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ decisions })
    });
  } catch (error) { console.error("Error submitting decisions:", error); }
}
// Also, make sure `submitBaserunningDecisions` is in your return object at the end of the file.

async function resolveDefensiveThrow(gameId, throwTo) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/resolve-throw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({ throwTo })
    });
    // The websocket event will handle the state update
  } catch (error) {
    console.error("Error resolving throw:", error);
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

  async function advanceRunners(gameId, decisions) {
  console.log('2. advanceRunners action called in the store.');
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
    // The websocket event will handle the state update
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

// in src/stores/game.js
async function initiateSteal(gameId) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/initiate-steal`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${auth.token}` },
    });
  } catch (error) {
    console.error("Error initiating steal:", error);
  }
}
// Don't forget to add `initiateSteal` to your return object!

async function attemptSteal(gameId, fromBase) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/steal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({ fromBase })
    });
    // The websocket event will handle the state update
  } catch (error) {
    console.error("Error attempting steal:", error);
  }
}

// in src/stores/game.js
async function submitInfieldInDecision(gameId, sendRunner) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/infield-in-play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ sendRunner })
    });
  } catch (error) {
    console.error("Error submitting infield in decision:", error);
  }
}

async function resetRolls(gameId) {
  const auth = useAuthStore();
  if (!auth.token) return;
  try {
    await fetch(`${auth.API_URL}/api/games/${gameId}/reset-rolls`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
  } catch (error) {
    console.error('Error resetting rolls:', error);
  }
}



  return { game, gameState, gameEvents, batter, pitcher, lineups, rosters, setupState, 
    fetchGame, initiateSteal,submitPitch, submitSwing, fetchGameSetup, submitRoll, submitGameSetup,submitTagUp,
    submitBaserunningDecisions,resolveDefensiveThrow,submitSubstitution, advanceRunners,setDefense,attemptSteal,submitInfieldInDecision,resetRolls };
})