<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const gameId = route.params.id;

// Local state for building the lineup
const startingPitcher = ref(null);
const battingOrder = ref([]);

const nonPitchers = computed(() => authStore.activeRosterCards.filter(p => !p.control));
const pitchers = computed(() => authStore.activeRosterCards.filter(p => p.control));

function setPitcher(pitcher) {
  startingPitcher.value = pitcher;
}

function addToLineup(player) {
  if (battingOrder.value.length < 9 && !battingOrder.value.find(p => p.card_id === player.card_id)) {
    battingOrder.value.push(player);
  }
}

function removeFromLineup(player) {
  battingOrder.value = battingOrder.value.filter(p => p.card_id !== player.card_id);
}

function moveUp(index) {
  if (index === 0) return;
  [battingOrder.value[index], battingOrder.value[index - 1]] = [battingOrder.value[index - 1], battingOrder.value[index]];
}

function moveDown(index) {
  if (index >= battingOrder.value.length - 1) return;
  [battingOrder.value[index], battingOrder.value[index + 1]] = [battingOrder.value[index + 1], battingOrder.value[index]];
}

async function handleSubmission() {
    if (battingOrder.value.length !== 9 || !startingPitcher.value) {
        return alert('You must select 9 batters and 1 starting pitcher.');
    }
    const lineupData = {
        battingOrder: battingOrder.value.map(p => p.card_id),
        startingPitcher: startingPitcher.value.card_id
    };
    await authStore.submitLineup(gameId, lineupData);
}

// In src/views/SetLineupView.vue
onMounted(async () => {
  // This is a more robust way to get the data this page needs
  const response = await fetch(`${authStore.API_URL}/api/games/${gameId}/my-roster`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
  });
  const participantInfo = await response.json();
  if (participantInfo.roster_id) {
    authStore.fetchRosterDetails(participantInfo.roster_id);
  }
});
</script>

<template>
  <div class="container">
    <h1>Set Your Lineup</h1>
    <div class="lineup-builder">
      <div class="panel">
        <h2>Your Roster</h2>
        <div class="player-list">
          <h3>Pitchers</h3>
          <div v-for="p in pitchers" :key="p.card_id" class="player-item" @click="setPitcher(p)">
            {{ p.name }} (SP)
          </div>
          <h3>Position Players</h3>
          <div v-for="p in nonPitchers" :key="p.card_id" class="player-item" @click="addToLineup(p)">
            {{ p.name }} ({{ p.positions }})
          </div>
        </div>
      </div>
      <div class="panel">
        <h2>Starting Pitcher</h2>
        <div class="pitcher-slot">
          <span v-if="startingPitcher">{{ startingPitcher.name }}</span>
          <span v-else class="placeholder">Click a pitcher to select</span>
        </div>

        <h2>Batting Order ({{ battingOrder.length }} / 9)</h2>
        <div class="lineup-slots">
          <div v-for="(player, index) in battingOrder" :key="player.card_id" class="lineup-item">
            <span>{{ index + 1 }}. {{ player.name }}</span>
            <div>
              <button @click="moveUp(index)" :disabled="index === 0">↑</button>
              <button @click="moveDown(index)" :disabled="index === battingOrder.length - 1">↓</button>
              <button @click="removeFromLineup(player)" class="remove-btn">X</button>
            </div>
          </div>
        </div>
        <button @click="handleSubmission" class="submit-btn">Submit Lineup</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .container { max-width: 1200px; margin: 2rem auto; font-family: sans-serif; }
  .lineup-builder { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  .panel { padding: 1rem; background-color: #f9f9f9; border-radius: 8px; }
  .player-list { max-height: 60vh; overflow-y: auto; }
  .player-item { padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #eee; }
  .player-item:hover { background-color: #eef8ff; }
  .pitcher-slot { border: 2px dashed #ccc; padding: 1rem; text-align: center; margin-bottom: 1rem; }
  .placeholder { color: #888; }
  .lineup-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee; }
  .remove-btn { color: red; margin-left: 0.5rem; }
  .submit-btn { width: 100%; padding: 1rem; font-size: 1.2rem; margin-top: 1rem; cursor: pointer; }
</style>