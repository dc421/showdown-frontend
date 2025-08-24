<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '@/stores/game';

const route = useRoute();
const gameStore = useGameStore();
const gameId = route.params.id;

onMounted(() => {
  gameStore.fetchGame(gameId);
});
</script>

<template>
  <div class="game-view" v-if="gameStore.gameState">
    <div class="scoreboard">
      <h1>Game On!</h1>
      <div class="inning">
        {{ gameStore.gameState.isTopInning ? 'Top' : 'Bottom' }} {{ gameStore.gameState.inning }}
      </div>
      <div class="score">
        <span>Away: {{ gameStore.gameState.awayScore }}</span>
        <span>Home: {{ gameStore.gameState.homeScore }}</span>
      </div>
      <div class="outs">
        Outs: {{ gameStore.gameState.outs }}
      </div>
    </div>

    <div class="actions">
      <button>Play Turn</button>
    </div>

    <div class="event-log">
      <h2>Game Log</h2>
      <ul>
        <li v-for="event in gameStore.gameEvents" :key="event.event_id">
          [Turn {{ event.turn_number }}]: {{ event.log_message }}
        </li>
      </ul>
    </div>
  </div>
  <div v-else>
    <p>Loading game...</p>
  </div>
</template>

<style scoped>
  .game-view {
    font-family: sans-serif;
    max-width: 900px;
    margin: 2rem auto;
  }
  .scoreboard {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    text-align: center;
    padding: 1rem;
    background-color: #f0f0f0;
    border-radius: 8px;
    margin-bottom: 2rem;
  }
  .inning, .outs {
    font-size: 1.5rem;
    font-weight: bold;
  }
  .score {
    display: flex;
    justify-content: space-around;
    font-size: 1.2rem;
  }
  .event-log {
    margin-top: 2rem;
  }
  .event-log ul {
    list-style: none;
    padding: 0;
    height: 300px;
    overflow-y: auto;
    border: 1px solid #ccc;
  }
  .event-log li {
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
</style>