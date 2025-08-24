<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const newRosterName = ref('');
const selectedPlayers = ref([]);
const benchPlayerIds = ref(new Set());

const playerCount = computed(() => selectedPlayers.value.length);

const starters = computed(() => selectedPlayers.value.filter(p => !benchPlayerIds.value.has(p.card_id)));
const startingPitchers = computed(() => starters.value.filter(p => Number(p.ip) > 3));
const positionPlayers = computed(() => starters.value.filter(p => !(Number(p.ip) > 3)));

const totalPoints = computed(() => {
  return selectedPlayers.value.reduce((sum, player) => {
    const isBenched = benchPlayerIds.value.has(player.card_id);
    const cost = (isBenched && player.control === null) ? Math.round(player.points / 5) : player.points;
    return sum + cost;
  }, 0);
});

const positionCoverage = computed(() => {
    const coverage = { C: 0, '2B': 0, SS: 0, '3B': 0, CF: 0, LFRF: 0 };
    positionPlayers.value.forEach(p => {
        if (p.positions?.includes('C')) coverage.C++;
        if (p.positions?.includes('2B')) coverage['2B']++;
        if (p.positions?.includes('SS')) coverage.SS++;
        if (p.positions?.includes('3B')) coverage['3B']++;
        if (p.positions?.includes('CF')) coverage.CF++;
        if (p.positions?.includes('LF') || p.positions?.includes('RF')) coverage.LFRF++;
    });
    return {
        ...coverage,
        SP: startingPitchers.value.length,
        PosPlayers: positionPlayers.value.length
    };
});

const isRosterValid = computed(() => {
    return playerCount.value === 20 &&
           totalPoints.value <= 5000 &&
           positionCoverage.value.SP === 4 &&
           positionCoverage.value.PosPlayers >= 9 &&
           positionCoverage.value.C >= 1 &&
           positionCoverage.value['2B'] >= 1 &&
           positionCoverage.value.SS >= 1 &&
           positionCoverage.value['3B'] >= 1 &&
           positionCoverage.value.CF >= 1 &&
           positionCoverage.value.LFRF >= 2;
});

function handlePlayerClick(player) {
  if (isPlayerSelected(player)) {
    removePlayer(player);
  } else {
    addPlayer(player);
  }
}

function addPlayer(player) {
  if (playerCount.value >= 20) return;
  if (selectedPlayers.value.some(p => p.name === player.name)) {
      alert(`${player.name} is already on your roster.`);
      return;
  }
  selectedPlayers.value.push(player);
}

function removePlayer(playerToRemove) {
  selectedPlayers.value = selectedPlayers.value.filter(p => p.card_id !== playerToRemove.card_id);
  benchPlayerIds.value.delete(playerToRemove.card_id);
}

function isPlayerSelected(player) {
    return selectedPlayers.value.some(p => p.card_id === player.card_id);
}

function toggleBench(playerId) {
    if (benchPlayerIds.value.has(playerId)) {
        benchPlayerIds.value.delete(playerId);
    } else {
        benchPlayerIds.value.add(playerId);
    }
}

async function saveRoster() {
  const fullPointTotal = selectedPlayers.value.reduce((sum, player) => sum + player.points, 0);
  if (fullPointTotal > 5000) {
      return alert(`Your roster is over the 5000 point limit at full value. Total: ${fullPointTotal}`);
  }
  if (!newRosterName.value) {
    return alert('Please enter a name for your roster.');
  }
  if (!isRosterValid.value) {
      return alert('Your roster is not valid. Please check the position and starter requirements.');
  }
  const rosterData = {
    roster_name: newRosterName.value,
    card_ids: selectedPlayers.value.map(p => p.card_id)
  };
  await authStore.createRoster(rosterData);
}

onMounted(() => {
  if (authStore.allPlayers.length === 0) {
    authStore.fetchAllPlayers();
  }
});
</script>

<template>
  <div class="builder-container">
    <div class="panel">
      <h2>Available Players</h2>
      <div class="player-list">
        <div 
          v-for="player in authStore.allPlayers" 
          :key="player.card_id"
          class="player-item"
          :class="{ 'selected': isPlayerSelected(player) }"
          @click="handlePlayerClick(player)">
          <span>{{ player.displayName }} ({{ player.displayPosition }})</span>
          <span>{{ player.points }} pts</span>
        </div>
      </div>
    </div>

    <div class="panel">
        <h2>Your Roster ({{ playerCount }} / 20)</h2>
        <div class="player-list selected-players-list">
         <div v-for="player in selectedPlayers" :key="player.card_id" class="player-item selected-item">
            <span class="player-name">{{ player.displayName }} ({{ player.displayPosition }})</span>
            <div>
                <label class="bench-toggle" v-if="player.control === null">
                    <input type="checkbox" @change="toggleBench(player.card_id)" />
                    Bench ({{ Math.round(player.points / 5) }} pts)
                </label>
                <button @click="removePlayer(player)" class="remove-btn">X</button>
            </div>
         </div>
      </div>
    </div>

    <div class="panel info-panel">
      <h2>Roster Info</h2>
      <input type="text" v-model="newRosterName" placeholder="Enter Roster Name" />
      <div class="roster-stats">
        <span :class="{ 'over-limit': totalPoints > 5000 }">
          Discounted Points: {{ totalPoints }} / 5000
        </span>
      </div>
      
      <div class="checklist">
          <h3>Starters Checklist ({{ starters.length }} players)</h3>
          <p :class="{ 'filled': positionCoverage.PosPlayers >= 9 }">Position Players ({{ positionCoverage.PosPlayers }}/9)</p>
          <hr/>
          <p :class="{ 'filled': positionCoverage.C >= 1 }">Catcher (1)</p>
          <p class="filled">1st Base (any)</p>
          <p :class="{ 'filled': positionCoverage['2B'] >= 1 }">2nd Base (1)</p>
          <p :class="{ 'filled': positionCoverage.SS >= 1 }">Shortstop (1)</p>
          <p :class="{ 'filled': positionCoverage['3B'] >= 1 }">3rd Base (1)</p>
          <p :class="{ 'filled': positionCoverage.CF >= 1 }">Center Field (1)</p>
          <p :class="{ 'filled': positionCoverage.LFRF >= 2 }">LF/RF (2)</p>
          <p class="filled">DH (any)</p>
          <hr/>
          <p :class="{ 'filled': positionCoverage.SP === 4 }">Starting Pitchers ({{ positionCoverage.SP }}/4)</p>
      </div>
      <button @click="saveRoster" :disabled="!isRosterValid">Save Roster</button>
    </div>
  </div>
</template>

<style scoped>
    .builder-container { display: grid; grid-template-columns: 1.2fr 1.2fr 1fr; gap: 1.5rem; padding: 1.5rem; height: 100vh; box-sizing: border-box; font-family: sans-serif; }
    .panel { display: flex; flex-direction: column; background: #f4f6f8; padding: 1rem; border-radius: 8px; overflow: hidden; }
    .player-list { flex-grow: 1; overflow-y: auto; border: 1px solid #ddd; background: white; border-radius: 4px; }
    .player-item { display: flex; justify-content: space-between; padding: 0.5rem 0.75rem; cursor: pointer; border-bottom: 1px solid #eee; transition: background-color 0.15s ease-in-out; font-size: 0.9em; }
    .player-item:hover { background-color: #eef8ff; }
    .player-item.selected { background-color: #e9ecef; color: #adb5bd; opacity: 0.6; } /* removed not-allowed cursor */
    .selected-item { display: flex; justify-content: space-between; align-items: center; }
    .player-name { cursor: default; }
    .remove-btn { background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 8px; padding: 2px 6px; }
    .bench-toggle { font-size: 0.8em; color: #666; }
    .info-panel { background-color: #e9ecef; }
    .info-panel input { padding: 0.75rem; font-size: 1rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 4px; }
    .roster-stats { font-weight: bold; font-size: 1.1rem; text-align: center; margin-bottom: 1rem; }
    .checklist { background: #fff; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; }
    .checklist h3 { margin: 0.5rem 0; }
    .checklist p { margin: 0.25rem 0; color: #888; transition: color 0.2s; }
    .checklist p.filled { color: #28a745; font-weight: bold; }
    hr { border: none; border-top: 1px solid #ddd; margin: 0.5rem 0; }
    .over-limit { color: #dc3545; }
    button { margin-top: auto; padding: 0.75rem; font-size: 1.1rem; cursor: pointer; border: none; border-radius: 4px; background-color: #007bff; color: white; font-weight: bold; }
    button:disabled { background-color: #6c757d; cursor: not-allowed; }
</style>