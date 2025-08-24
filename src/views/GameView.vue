<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { socket } from '@/services/socket';
import PlayerCard from '@/components/PlayerCard.vue'; // <-- IMPORT COMPONENT

const route = useRoute();
const gameStore = useGameStore();
const authStore = useAuthStore();
const gameId = route.params.id;

// ... (isMyTurn computed property and handlePlayTurn function are the same)
const isMyTurn = computed(() => {
  if (!authStore.user || !gameStore.game) return false;
  return authStore.user.userId === gameStore.game.current_turn_user_id;
});

function handlePlayTurn() {
  gameStore.playTurn(gameId);
}


onMounted(() => {
  // ... (socket connection logic is the same)
  gameStore.fetchGame(gameId);
  socket.connect();
  socket.emit('join-game-room', gameId);
  socket.on('game-updated', () => {
    console.log('Received game-updated event! Refetching game data...');
    gameStore.fetchGame(gameId);
  });
});

onUnmounted(() => {
  // ... (socket disconnect logic is the same)
  socket.off('game-updated');
  socket.disconnect();
});
</script>

<template>
  <div class="game-view" v-if="gameStore.gameState">
    <div class="at-bat-display">
      <PlayerCard :player="gameStore.pitcher" role="Pitcher" />
      <div class="vs">VS</div>
      <PlayerCard :player="gameStore.batter" role="Batter" />
    </div>

    <div class="scoreboard">
      <h1>Game On!</h1>
      <div class="inning">{{ gameStore.gameState.isTopInning ? 'Top' : 'Bottom' }} {{ gameStore.gameState.inning }}</div>
      <div class="score"><span>Away: {{ gameStore.gameState.awayScore }}</span><span>Home: {{ gameStore.gameState.homeScore }}</span></div>
      <div class="outs">Outs: {{ gameStore.gameState.outs }}</div>
    </div>
    
    <div class="actions">
      <div v-if="isMyTurn" class="turn-indicator your-turn">It's YOUR turn!</div>
      <div v-else class="turn-indicator">Waiting for opponent...</div>
      <button @click="handlePlayTurn" :disabled="!isMyTurn">Play Turn</button>
    </div>

    <div class="event-log">
      <h2>Game Log</h2>
      <ul><li v-for="(event, index) in gameStore.gameEvents" :key="index">{{ event.log_message }}</li></ul>
    </div>
  </div>
  <div v-else>
    <p>Loading game...</p>
  </div>
</template>

<style scoped>
  /* ... (previous styles are the same) ... */
  .at-bat-display {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    margin-bottom: 2rem;
  }
  .vs {
    font-size: 2rem;
    font-weight: bold;
    color: #888;
  }
</style>