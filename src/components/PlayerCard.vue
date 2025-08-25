<script setup>
import { computed } from 'vue';

const props = defineProps({
  player: Object,
  role: String,
  battingOrderPosition: Number,
  defensivePosition: String
});

function formatRange(range) {
  const parts = range.split('-');
  return parts[0] === parts[1] ? parts[0] : range;
}

// NEW: A computed property to create the detailed fielding string
const fieldingDisplay = computed(() => {
    if (!props.player?.fielding_ratings) return 'N/A';
    return Object.entries(props.player.fielding_ratings)
        .map(([pos, val]) => `${pos.replace(/LFRF/g, 'LF/RF')} ${val >= 0 ? '+' : ''}${val}`)
        .join(', ');
});
</script>

<template>
  <div class="player-card" v-if="player">
    <div class="card-header">
      <h3 v-if="role === 'Batter' && defensivePosition !== undefined">
        {{ battingOrderPosition + 1 }}. {{ defensivePosition }} {{ player.name }}
      </h3>
      <h3 v-else>{{ player.name }}</h3>
      <span>{{ player.points }} pts</span>
    </div>
    <div class="card-body">
      <p>
        <strong>Team:</strong> {{ player.team }}
        <span v-if="player.speed"> | <strong>Speed:</strong> {{ player.speed }}</span>
      </p>
      <div v-if="role === 'Batter'">
        <p><strong>On-Base:</strong> <span class="key-stat">{{ player.on_base }}</span></p>
        <p><strong>Fielding:</strong> {{ fieldingDisplay }}</p>
      </div>
      <div v-if="role === 'Pitcher'">
        <p><strong>Control:</strong> <span class="key-stat">{{ player.control }}</span> | <strong>IP:</strong> {{ player.ip }}</p>
      </div>
      <div class="chart">
        <strong>Outcome Chart:</strong>
        <ul>
          <li v-for="(outcome, range) in player.chart_data" :key="range">
            {{ formatRange(range) }}: {{ outcome }}
          </li>
        </ul>
      </div>
    </div>
  </div>
  <div v-else class="player-card placeholder">
    <p>Loading {{ role }}...</p>
  </div>
</template>

<style scoped>
.player-card { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 300px; }
.placeholder { text-align: center; color: #888; }
.card-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
.card-header h3 { margin: 0; font-size: 1.1em; }
p { margin: 0.25rem 0; }
.key-stat {
    font-size: 1.5em;
    font-weight: bold;
    color: #007bff;
}
.chart { margin-top: 0.5rem; }
.chart ul { list-style: none; padding: 0; margin-top: 0.5rem; font-size: 0.85em; column-count: 2; }
</style>