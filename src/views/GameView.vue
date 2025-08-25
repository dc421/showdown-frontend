<script setup>
// This is the full and final script
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { socket } from '@/services/socket';
import PlayerCard from '@/components/PlayerCard.vue';

const route = useRoute();
const gameStore = useGameStore();
const authStore = useAuthStore();
const gameId = route.params.id;

const isMyTurn = computed(() => {
  if (!authStore.user || !gameStore.game) return false;
  return authStore.user.userId === gameStore.game.current_turn_user_id;
});

const atBatStatus = computed(() => gameStore.gameState?.atBatStatus || 'pitching');

const isDefensivePlayer = computed(() => {
    if (!authStore.user || !gameStore.gameState) return false;
    const offensiveTeam = gameStore.gameState.isTopInning ? gameStore.gameState.awayTeam : gameStore.gameState.homeTeam;
    return authStore.user.userId !== offensiveTeam.userId;
});

const batterLineupInfo = computed(() => {
    if (!gameStore.gameState || !gameStore.lineups) return null;
    const lineup = gameStore.gameState.isTopInning ? gameStore.lineups.away : gameStore.lineups.home;
    if (!lineup) return null;
    const pos = gameStore.gameState.isTopInning ? gameStore.gameState.awayTeam.battingOrderPosition : gameStore.gameState.homeTeam.battingOrderPosition;
    return lineup[pos];
});

function handlePitch() {
  gameStore.submitPitch(gameId);
}
function handleSwing() {
  gameStore.submitSwing(gameId);
}

onMounted(() => {
  gameStore.fetchGame(gameId);
  socket.connect();
  socket.emit('join-game-room', gameId);
  socket.on('game-updated', () => {
    gameStore.fetchGame(gameId);
  });
});

onUnmounted(() => {
  socket.off('game-updated');
  socket.disconnect();
});
</script>

<template>
  <div class="game-container" v-if="gameStore.gameState && gameStore.lineups">
    <div class="side-panels">
        <div class="lineup-panel">
            <h3>Away Lineup</h3>
            <ol><li v-for="(spot, index) in gameStore.lineups.away" :key="spot.card_id" :class="{ 'now-batting': gameStore.gameState.isTopInning && index === gameStore.gameState.awayTeam.battingOrderPosition }">
                {{ spot.player.name }} ({{ spot.position }})
            </li></ol>
        </div>
    </div>
    <div class="main-view">
        <div class="at-bat-display">
          <PlayerCard :player="gameStore.pitcher" role="Pitcher" />
          <div class="vs-area">
            <div class="vs">VS</div>
            <div v-if="gameStore.gameState.pitchRollResult" class="pitch-result">
                Pitch Roll: {{ gameStore.gameState.pitchRollResult.roll }}<br/>
                Advantage: <strong>{{ gameStore.gameState.pitchRollResult.advantage.toUpperCase() }}</strong>
            </div>
          </div>
          <PlayerCard 
            :player="gameStore.batter" 
            role="Batter" 
            :battingOrderPosition="gameStore.gameState.isTopInning ? gameStore.gameState.awayTeam.battingOrderPosition : gameStore.gameState.homeTeam.battingOrderPosition"
            :defensivePosition="batterLineupInfo?.position"
          />
        </div>
        <div class="scoreboard">
            <div class="team-score">Away: {{ gameStore.gameState.awayScore }}</div>
            <div class="inning-display">
                <div class="inning-arrow" :class="{ top: gameStore.gameState.isTopInning }">▲</div>
                <div>{{ gameStore.gameState.inning }}</div>
                <div class="inning-arrow" :class="{ bottom: !gameStore.gameState.isTopInning }">▼</div>
            </div>
            <div class="team-score">Home: {{ gameStore.gameState.homeScore }}</div>
            <div class="outs-display">Outs: {{ gameStore.gameState.outs }}</div>
        </div>
        <div class="actions">
            <div v-if="!isMyTurn" class="turn-indicator">Waiting for opponent...</div>
            <div v-else>
                <button v-if="atBatStatus === 'pitching' && !isDefensivePlayer" disabled>Waiting for Pitch...</button>
                <button v-if="atBatStatus === 'pitching' && isDefensivePlayer" @click="handlePitch">Roll for Pitch</button>
                <button v-if="atBatStatus === 'swinging' && isDefensivePlayer" disabled>Waiting for Swing...</button>
                <button v-if="atBatStatus === 'swinging' && !isDefensivePlayer" @click="handleSwing">Roll for Swing</button>
            </div>
        </div>
        <div class="event-log">
            <h2>Game Log</h2>
            <ul><li v-for="(event, index) in gameStore.gameEvents" :key="index">{{ event.log_message }}</li></ul>
        </div>
    </div>
    <div class="side-panels">
        <div class="lineup-panel">
            <h3>Home Lineup</h3>
            <ol><li v-for="(spot, index) in gameStore.lineups.home" :key="spot.card_id" :class="{ 'now-batting': !gameStore.gameState.isTopInning && index === gameStore.gameState.homeTeam.battingOrderPosition }">
                {{ spot.player.name }} ({{ spot.position }})
            </li></ol>
        </div>
    </div>
  </div>
  <div v-else class="loading-container"><p>Loading game...</p></div>
</template>

<style scoped>
.game-container { display: grid; grid-template-columns: 1fr 2.5fr 1fr; gap: 1rem; max-width: 1600px; margin: 1rem auto; font-family: sans-serif; }
.now-batting { background-color: #fff8e1; font-weight: bold; }
.at-bat-display { display: flex; justify-content: center; align-items: flex-start; gap: 2rem; margin-bottom: 1.5rem; }
.vs-area { text-align: center; padding-top: 5rem; }
.vs { font-size: 2.5rem; font-weight: bold; color: #888; }
.pitch-result { margin-top: 1rem; background: #fff8e1; padding: 0.5rem; border-radius: 4px; border: 1px solid #ffecb3; }
.scoreboard { display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto; padding: 1rem; background-color: #343a40; color: white; border-radius: 8px; margin-bottom: 1.5rem; text-align: center; }
.team-score { font-size: 2rem; font-weight: bold; }
.inning-display { grid-column: 2 / 3; display: flex; align-items: center; gap: 1rem; font-size: 1.5rem; }
.inning-arrow { opacity: 0.2; }
.inning-arrow.top, .inning-arrow.bottom { opacity: 1; }
.outs-display { grid-column: 1 / 4; font-size: 1.2rem; margin-top: 0.5rem; }
.actions { text-align: center; margin-bottom: 1.5rem; }
.actions button { padding: 0.75rem 1.5rem; font-size: 1.2rem; cursor: pointer; }
.actions button:disabled { cursor: not-allowed; background-color: #ccc; }
.turn-indicator { font-style: italic; color: #555; }
.side-panels { display: flex; flex-direction: column; gap: 1rem; }
.lineup-panel { background: #f9f9f9; padding: 1rem; border-radius: 8px; }
.lineup-panel h3 { margin-top: 0; }
.lineup-panel ol { padding-left: 20px; margin: 0; }
.event-log { flex-grow: 1; background: #f9f9f9; padding: 1rem; border-radius: 8px; }
.event-log ul { list-style: none; padding: 0; height: 300px; overflow-y: auto; }
.event-log li { padding: 0.5rem; border-bottom: 1px solid #eee; }
.loading-container { text-align: center; padding: 5rem; font-size: 1.5rem; }
</style>