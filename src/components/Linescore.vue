<script setup>
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore();
// We no longer need to define props, as this component is now self-sufficient.

const linescore = computed(() => {
  const innings = Array.from({ length: Math.max(9, gameStore.gameState?.inning || 0) }, (_, i) => i + 1);
  const scores = {
    away: { runs: [] },
    home: { runs: [] },
  };

  if (!gameStore.gameEvents || !gameStore.gameState) {
    return { innings, scores };
  }

  let awayRunsInInning = 0;
  let homeRunsInInning = 0;
  let isTop = true;

  gameStore.gameEvents.forEach(event => {
    if (event.log_message.includes('---')) { // Inning change marker
      if (isTop) { scores.away.runs.push(awayRunsInInning); } 
      else { scores.home.runs.push(homeRunsInInning); }
      awayRunsInInning = 0;
      homeRunsInInning = 0;
      isTop = event.log_message.includes('Top');
    }
    if (event.log_message.includes('scores!')) {
      if (isTop) { awayRunsInInning++; } 
      else { homeRunsInInning++; }
    }
  });
  
  if (isTop) {
    scores.away.runs.push(awayRunsInInning);
  } else {
     scores.away.runs.push(awayRunsInInning);
     scores.home.runs.push(homeRunsInInning);
  }

  return { innings, scores };
});

const awayTeamAbbr = computed(() => gameStore.teams?.away?.abbreviation || 'AWAY');
const homeTeamAbbr = computed(() => gameStore.teams?.home?.abbreviation || 'HOME');
</script>

<template>
  <table class="linescore-table">
      <thead>
        <tr>
          <th></th>
          <th v-for="inning in linescore.innings" :key="inning">{{ inning }}</th>
          <th>R</th>
          <th>Outs</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ awayTeamAbbr }}</td>
          <td 
            v-for="(run, index) in linescore.scores.away.runs" 
            :key="`away-${index}`"
            :class="{ 'current-inning': gameStore.gameState.isTopInning && (index + 1) === gameStore.gameState.inning }"
          >{{ run }}</td>
          <td v-for="i in linescore.innings.length - linescore.scores.away.runs.length" :key="`away-empty-${i}`"></td>
          <td>{{ gameStore.gameState.awayScore }}</td>
          <td>
            <span v-if="gameStore.gameState.isTopInning">{{ gameStore.gameState.outs }}</span>
          </td>
        </tr>
        <tr>
          <td>{{ homeTeamAbbr }}</td>
          <td 
            v-for="(run, index) in linescore.scores.home.runs" 
            :key="`home-${index}`"
            :class="{ 'current-inning': !gameStore.gameState.isTopInning && (index + 1) === gameStore.gameState.inning }"
          >{{ run }}</td>
          <td v-for="i in linescore.innings.length - linescore.scores.home.runs.length" :key="`home-empty-${i}`"></td>
          <td>{{ gameStore.gameState.homeScore }}</td>
          <td>
            <span v-if="!gameStore.gameState.isTopInning">{{ gameStore.gameState.outs }}</span>
          </td>
        </tr>
      </tbody>
    </table>
</template>

<style scoped>
/* All styles are the same as the last working version */
.linescore-table {
  color: white;
  font-family: monospace;
  border-collapse: collapse;
  font-size: 1em;
}
.linescore-table th,
.linescore-table td {
  text-align: center;
  padding: 0.1rem 0.4rem;
  min-width: 25px;
}
.linescore-table th {
  font-weight: normal;
  color: rgba(255, 255, 255, 0.7);
}
.linescore-table td:first-child {
  text-align: left;
  font-weight: bold;
  min-width: 40px;
}
.linescore-table tr td:nth-last-child(2) {
  font-weight: bold;
  border-left: 1px solid rgba(255, 255, 255, 0.5);
}
.linescore-table tr td:last-child {
  font-weight: bold;
  color: #dc3545;
}
.current-inning {
  color: #ffc107;
  font-weight: bold;
}
</style>