<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { socket } from '@/services/socket';

const authStore = useAuthStore();
const gameStore = useGameStore();
const route = useRoute();
const router = useRouter();
const gameId = route.params.id;

const startingPitcher = ref(null);
const battingOrder = ref([]);
const hasSubmitted = ref(false); // New state for the waiting screen
const useDh = computed(() => gameStore.game?.use_dh !== false);

const defensivePositions = computed(() => {
  const positions = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
  if (useDh.value) {
    positions.push('DH');
  }
  return positions;
});

const starters = computed(() => authStore.activeRosterCards.filter(p => p.is_starter));
const startingPitchers = computed(() => starters.value.filter(p => p.displayPosition === 'SP'));
const positionPlayers = computed(() => starters.value.filter(p => p.displayPosition !== 'SP' && p.displayPosition !== 'RP'));

const availableBatters = computed(() => {
  return positionPlayers.value.filter(p => !battingOrder.value.some(bo => bo.player.card_id === p.card_id));
});

function isPlayerEligibleForPosition(player, position) {
    if (!player || !position) return false;
    if (player.displayPosition === 'SP' || player.displayPosition === 'RP') return position === 'P';
    if (position === '1B' || (position === 'DH' && useDh.value)) return true;
    const playerPositions = player.fielding_ratings ? Object.keys(player.fielding_ratings) : [];
    if (position === 'LF' || position === 'RF') return playerPositions.includes('LF') || playerPositions.includes('RF') || playerPositions.includes('LFRF');
    return playerPositions.includes(position);
}

const duplicatePositions = computed(() => {
    const positions = battingOrder.value.map(spot => spot.position).filter(pos => pos);
    const positionCounts = positions.reduce((acc, pos) => {
        const key = pos === 'P' ? 'DH' : pos;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    return new Set(Object.keys(positionCounts).filter(pos => positionCounts[pos] > 1));
});

const isLineupValid = computed(() => {
  if (!startingPitcher.value || battingOrder.value.length !== 9) return false;
  if (duplicatePositions.value.size > 0) return false;
  
  for (const spot of battingOrder.value) {
    if (!spot.position || !isPlayerEligibleForPosition(spot.player, spot.position)) return false;
  }
  return true;
});

function autoPopulateLineup() {
  const playersToOrder = [...positionPlayers.value].sort((a, b) => b.points - a.points);
  const lineupSize = useDh.value ? 9 : 8;
  const topPlayers = playersToOrder.slice(0, lineupSize);
  
  const lineup = [];
  let assignedPlayerIds = new Set();
  let assignedPositions = new Set();
  const positionPriority = defensivePositions.value;

  topPlayers.forEach(player => {
    const p_pos = player.fielding_ratings ? Object.keys(player.fielding_ratings) : [];
    for (const pos of positionPriority) {
        if (isPlayerEligibleForPosition(player, pos) && !assignedPositions.has(pos)) {
            lineup.push({ player, position: pos });
            assignedPlayerIds.add(player.card_id);
            assignedPositions.add(pos);
            return;
        }
    }
  });
  const remainingPlayers = topPlayers.filter(p => !assignedPlayerIds.has(p.card_id));
  const remainingPositions = positionPriority.filter(p => !assignedPositions.has(p));
  remainingPlayers.forEach((player) => {
    if (remainingPositions.length > 0) {
        const pos = remainingPositions.shift();
        lineup.push({ player, position: pos });
    }
  });
  battingOrder.value = lineup;
}

watch(startingPitcher, (newPitcher) => {
    if (!useDh.value && newPitcher) {
        battingOrder.value = battingOrder.value.filter(p => p.player.displayPosition !== 'SP' && p.player.displayPosition !== 'RP');
        if (battingOrder.value.length === 8) {
            battingOrder.value.push({ player: newPitcher, position: 'P' });
        }
    }
});

function addToLineup(player) {
    const lineupSize = useDh.value ? 9 : 8;
    const currentPositionPlayers = battingOrder.value.filter(spot => spot.player.control === null);
    if (currentPositionPlayers.length < lineupSize) {
        battingOrder.value.push({ player: player, position: null });
    } else {
        alert('All position player spots in the lineup are full.');
    }
}

function removeFromLineup(card_id) {
  battingOrder.value = battingOrder.value.filter(p => p.player.card_id !== card_id);
}

function moveUp(index) {
  if (index > 0) {
    [battingOrder.value[index], battingOrder.value[index - 1]] = [battingOrder.value[index - 1], battingOrder.value[index]];
  }
}

function moveDown(index) {
  if (index < battingOrder.value.length - 1) {
    [battingOrder.value[index], battingOrder.value[index + 1]] = [battingOrder.value[index + 1], battingOrder.value[index]];
  }
}

async function handleSubmission() {
    if (!isLineupValid.value) {
        return alert('Lineup is invalid. Please select 1 SP and assign 9 unique and legal positions to your batters.');
    }
    const lineupData = {
        battingOrder: battingOrder.value.map(p => ({ card_id: p.player.card_id, position: p.position })),
        startingPitcher: startingPitcher.value.card_id
    };
    await authStore.submitLineup(gameId, lineupData);
    hasSubmitted.value = true; // Show the waiting message
}

onMounted(async () => {
  await gameStore.fetchGame(gameId);
  const participantInfo = await authStore.fetchMyParticipantInfo(gameId);
  if (participantInfo && participantInfo.roster_id) {
    await authStore.fetchRosterDetails(participantInfo.roster_id);
    autoPopulateLineup();
  }
  socket.connect();
  socket.emit('join-game-room', gameId);
  socket.on('game-starting', () => {
    router.push(`/game/${gameId}`);
  });
});

onUnmounted(() => {
  socket.off('game-starting');
});
</script>

<template>
  <div class="container">
    <div v-if="!hasSubmitted">
      <h1>Set Your Starting Lineup</h1>
      <h2 class="subtitle" v-if="!useDh">Pitcher will bat</h2>
      <div class="lineup-builder">
        <div class="panel">
          <h2>Your Starters</h2>
          <div class="player-list">
            <h3>Position Players ({{ positionPlayers.length }})</h3>
            <div v-for="p in availableBatters" :key="p.card_id" class="player-item" @click="addToLineup(p)">
              {{ p.name }} ({{ p.displayPosition }})
            </div>
            <h3>Starting Pitchers ({{ startingPitchers.length }})</h3>
            <div v-for="p in startingPitchers" :key="p.card_id" class="player-item">
              {{ p.name }} (SP)
            </div>
          </div>
        </div>
        <div class="panel">
          <h2>Starting Pitcher</h2>
          <select v-model="startingPitcher" class="pitcher-select">
            <option :value="null" disabled>Select an SP...</option>
            <option v-for="p in startingPitchers" :key="p.card_id" :value="p">
              {{ p.name }}
            </option>
          </select>
          <h2>Batting Order ({{ battingOrder.length }} / 9)</h2>
          <div class="lineup-slots">
            <div v-for="(spot, index) in battingOrder" :key="spot.player.card_id" class="lineup-item">
              <span>{{ index + 1 }}. {{ spot.player.name }}</span>
              <div>
                <select v-model="spot.position" 
                  :class="{ 
                      'invalid-position': spot.position && !isPlayerEligibleForPosition(spot.player, spot.position),
                      'duplicate-position': duplicatePositions.has(spot.position) 
                  }" 
                  :disabled="spot.player.displayPosition === 'SP' || spot.player.displayPosition === 'RP'">
                  <option :value="null" disabled>Pos...</option>
                  <option v-if="!useDh && (spot.player.displayPosition === 'SP' || spot.player.displayPosition === 'RP')" value="P">P</option>
                  <option v-for="pos in defensivePositions" :key="pos" :value="pos">{{ pos }}</option>
                </select>
                <button @click="moveUp(index)" :disabled="index === 0" class="order-btn">↑</button>
                <button @click="moveDown(index)" :disabled="index === battingOrder.length - 1" class="order-btn">↓</button>
                <button @click="removeFromLineup(spot.player.card_id)" class="remove-btn">X</button>
              </div>
            </div>
          </div>
          <button @click="handleSubmission" :disabled="!isLineupValid" class="submit-btn">Submit Lineup</button>
        </div>
      </div>
    </div>
    <div v-else class="waiting-message panel">
        <h1>Lineup Submitted!</h1>
        <p>Waiting for your opponent to set their lineup...</p>
        <p>(You will be taken to the game automatically when they are ready)</p>
    </div>
  </div>
</template>

<style scoped>
  .container { max-width: 1000px; margin: 2rem auto; font-family: sans-serif; }
  .lineup-builder { display: grid; grid-template-columns: 1fr 1.5fr; gap: 2rem; }
  .panel { padding: 1rem; background-color: #f9f9f9; border-radius: 8px; }
  .player-list { max-height: 60vh; overflow-y: auto; }
  h3 { margin-top: 1rem; margin-bottom: 0.5rem; }
  .player-item { padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #eee; }
  .player-item:hover { background-color: #eef8ff; }
  .pitcher-select { width: 100%; padding: 0.5rem; margin-bottom: 1rem; font-size: 1rem; border-radius: 4px; border: 1px solid #ccc; }
  .lineup-slots { max-height: 50vh; overflow-y: auto; }
  .lineup-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee; }
  .lineup-item select { border-radius: 4px; border: 1px solid #ccc; }
  .lineup-item select.invalid-position, .lineup-item select.duplicate-position { border-color: orange; background-color: #fff3e0; }
  .remove-btn { color: red; margin-left: 0.5rem; background: transparent; border: none; font-size: 1.2rem; cursor: pointer; }
  .order-btn { margin-left: 0.5rem; padding: 2px 6px; }
  .submit-btn { width: 100%; padding: 1rem; font-size: 1.2rem; margin-top: 1rem; cursor: pointer; border-radius: 4px; border: none; color: white; background-color: #28a745; }
  .submit-btn:disabled { background-color: #ccc; cursor: not-allowed; }
  .subtitle { text-align: center; color: #dc3545; font-weight: bold; margin-top: -1rem; margin-bottom: 1rem; }
  .waiting-message { text-align: center; }
</style>