<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { socket } from '@/services/socket';

const gameStore = useGameStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const gameId = route.params.id;

// --- State ---
const homeTeamUserId = ref(null);
const useDh = ref(true);
const rollWinnerId = ref(null);

// --- Computed Properties ---
const participants = computed(() => gameStore.setupState?.participants || []);
const diceRolls = computed(() => gameStore.setupState?.rolls || {});
const iHaveRolled = computed(() => authStore.user?.userId in diceRolls.value);
const bothPlayersHaveRolled = computed(() => participants.value.length > 0 && Object.keys(diceRolls.value).length === participants.value.length);
const iAmTheWinner = computed(() => authStore.user?.userId === rollWinnerId.value);

// --- Methods ---
function determineRollWinner() {
  if (!bothPlayersHaveRolled.value) return;
  const [playerA, playerB] = participants.value;
  const rollA = diceRolls.value[playerA.user_id];
  const rollB = diceRolls.value[playerB.user_id];
  if (rollA !== rollB) {
    rollWinnerId.value = rollA > rollB ? playerA.user_id : playerB.user_id;
  }
}

async function chooseHomeOrAway(choice) {
    const opponent = participants.value.find(p => p.user_id !== rollWinnerId.value);
    const finalHomeTeamId = choice === 'home' ? rollWinnerId.value : opponent.user_id;
    
    // This is now the final action, so we submit it
    await gameStore.submitGameSetup(gameId, {
      homeTeamUserId: finalHomeTeamId,
      useDh: useDh.value
    });
}

async function declareHomeTeam(homePlayer) {
    // This is also a final action
    await gameStore.submitGameSetup(gameId, {
        homeTeamUserId: homePlayer.user_id,
        useDh: useDh.value
    });
}

// --- Lifecycle Hooks & Watchers ---
onMounted(() => {
  gameStore.fetchGameSetup(gameId);
  socket.connect();
  socket.emit('join-game-room', gameId);
  socket.on('setup-updated', () => {
    // When setup is complete, this event is fired from the backend
    // and both players will be redirected.
    router.push(`/game/${gameId}/lineup`);
  });
});

onUnmounted(() => {
  socket.off('setup-updated');
});

watch(diceRolls, () => {
    if (bothPlayersHaveRolled.value) {
        determineRollWinner();
    }
}, { deep: true });
</script>

<template>
  <div class="container">
    <h1>Game Setup</h1>
    <div class="panel" v-if="participants.length > 0">
      <div class="setup-section" v-if="!rollWinnerId">
          <h2>1. Determine Home Team</h2>
          <p>Have one player declare or have both players roll.</p>
          <div class="declare-buttons">
              <button @click="declareHomeTeam(participants[0])">{{ participants[0].username }} is Home</button>
              <button @click="declareHomeTeam(participants[1])">{{ participants[1].username }} is Home</button>
          </div>
          <hr />
          <div class="participants">
              <div v-for="player in participants" :key="player.user_id" class="participant">
                  <span>{{ player.username }}</span>
                  <span class="roll" v-if="diceRolls[player.user_id]">{{ diceRolls[player.user_id] }}</span>
                  <button v-else-if="authStore.user.userId === player.user_id && !iHaveRolled" @click="gameStore.submitRoll(gameId)">
                      Roll Your Die
                  </button>
                  <span v-else class="waiting-text">Waiting...</span>
              </div>
          </div>
          <div v-if="bothPlayersHaveRolled && diceRolls[participants[0].user_id] === diceRolls[participants[1].user_id]" class="result">
              <strong>Tie! Roll again.</strong>
          </div>
      </div>
      
      <div class="setup-section" v-if="rollWinnerId">
        <h2>2. Winner Selects Rules</h2>
        <div v-if="iAmTheWinner">
            <p><strong>You won the roll!</strong> Make your selections.</p>
            <div class="dh-toggle">
              <label><input type="radio" :value="true" v-model="useDh"> Use DH</label>
              <label><input type="radio" :value="false" v-model="useDh"> No DH (Pitcher Bats)</label>
            </div>
            <div class="choice-buttons">
              <button @click="chooseHomeOrAway('home')" class="choice-btn">I want to be HOME</button>
              <button @click="chooseHomeOrAway('away')" class="choice-btn">I want to be AWAY</button>
            </div>
        </div>
        <div v-else>
            <p>You lost the roll. Waiting for your opponent to make selections...</p>
        </div>
      </div>
    </div>
    <div v-else>Loading...</div>
  </div>
</template>

<style scoped>
  hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
  .container { max-width: 600px; margin: 2rem auto; font-family: sans-serif; text-align: center; }
  .panel { padding: 2rem; background-color: #f9f9f9; border-radius: 8px; }
  .setup-section { margin-bottom: 2rem; }
  .participants { display: flex; justify-content: space-around; align-items: flex-start; margin: 1rem 0; font-size: 1.2rem; }
  .participant { display: flex; flex-direction: column; align-items: center; min-height: 80px; }
  .roll { font-size: 2rem; font-weight: bold; margin-top: 0.5rem; }
  .waiting-text { font-style: italic; color: #888; margin-top: 10px; }
  .result { margin-top: 1rem; font-size: 1.1rem; }
  .choice-buttons { margin-top: 1rem; }
  .choice-btn { margin: 0 0.5rem; background-color: #007bff; color: white; }
  .dh-toggle { margin: 1rem 0; }
  .dh-toggle label { margin-right: 1.5rem; }
  .declare-buttons button { margin: 0 0.5rem; }
  button { padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; }
</style>