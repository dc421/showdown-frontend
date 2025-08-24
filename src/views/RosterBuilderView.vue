<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

// Local state for building the new roster
const newRosterName = ref('');
const selectedPlayers = ref([]);

// Computed properties that automatically update
const totalPoints = computed(() => {
  return selectedPlayers.value.reduce((sum, player) => sum + player.points, 0);
});

const playerCount = computed(() => selectedPlayers.value.length);

// Methods to manage the roster
function addPlayer(player) {
  if (playerCount.value >= 20) {
    alert('You can only select 20 players.');
    return;
  }
  if (!selectedPlayers.value.some(p => p.card_id === player.card_id)) {
    selectedPlayers.value.push(player);
  }
}

function removePlayer(playerToRemove) {
  selectedPlayers.value = selectedPlayers.value.filter(p => p.card_id !== playerToRemove.card_id);
}

function isPlayerSelected(player) {
    return selectedPlayers.value.some(p => p.card_id === player.card_id);
}

async function saveRoster() {
  if (!newRosterName.value) {
    return alert('Please enter a name for your roster.');
  }
  if (playerCount.value !== 20) {
    return alert('You must select exactly 20 players.');
  }

  const rosterData = {
    roster_name: newRosterName.value,
    card_ids: selectedPlayers.value.map(p => p.card_id)
  };

  await authStore.createRoster(rosterData);
}

onMounted(() => {
  // Fetch all player cards when the component loads
  if (authStore.allPlayers.length === 0) {
    authStore.fetchAllPlayers();
  }
});
</script>

<template>
  <div class="builder-container">
    <div class="player-list-panel">
      <h2>Available Players ({{ authStore.allPlayers.length }})</h2>
      <div class="player-list">
        <div 
          v-for="player in authStore.allPlayers" 
          :key="player.card_id"
          class="player-item"
          :class="{ 'selected': isPlayerSelected(player) }"
          @click="addPlayer(player)">
          <span>{{ player.name }}</span>
          <span>{{ player.points }} pts</span>
        </div>
      </div>
    </div>

    <div class="roster-panel">
      <h2>New Roster</h2>
      <input type="text" v-model="newRosterName" placeholder="Enter Roster Name" />
      <div class="roster-stats">
        <span>Players: {{ playerCount }} / 20</span>
        <span :class="{ 'over-limit': totalPoints > 5000 }">
          Points: {{ totalPoints }} / 5000
        </span>
      </div>
      <div class="selected-players-list">
         <div 
          v-for="player in selectedPlayers" 
          :key="player.card_id"
          class="player-item"
          @click="removePlayer(player)">
          <span>{{ player.name }}</span>
          <span>{{ player.points }} pts</span>
        </div>
      </div>
      <button @click="saveRoster" :disabled="playerCount !== 20">Save Roster</button>
    </div>
  </div>
</template>

<style scoped>
.builder-container {
  display: flex;
  gap: 2rem;
  padding: 2rem;
  height: 100vh;
  box-sizing: border-box;
}
.player-list-panel, .roster-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
}
.player-list, .selected-players-list {
  overflow-y: auto;
  border: 1px solid #ddd;
  background: white;
}
.player-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}
.player-item:hover {
  background-color: #eef8ff;
}
.player-item.selected {
  background-color: #ddd;
  color: #777;
  cursor: not-allowed;
}
.roster-panel input {
  padding: 0.5rem;
  font-size: 1rem;
  margin-bottom: 1rem;
}
.roster-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-weight: bold;
}
.over-limit {
  color: red;
}
button {
  margin-top: auto;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}
button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>