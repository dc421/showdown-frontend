<script setup>
defineProps({
  player: Object,
  role: String, // 'Batter' or 'Pitcher'
});
</script>

<template>
  <div class="player-card" v-if="player">
    <div class="card-header">
      <h3>{{ player.name }}</h3>
      <span>{{ player.points }} pts</span>
    </div>
    <div class="card-body">
      <p><strong>Team:</strong> {{ player.team }}</p>
      <p v-if="role === 'Batter'">
        <strong>On-Base:</strong> {{ player.on_base }} | <strong>Pos:</strong> {{ player.positions }}
      </p>
      <p v-if="role === 'Pitcher'">
        <strong>Control:</strong> {{ player.control }} | <strong>IP:</strong> {{ player.ip }}
      </p>
      <div class="chart">
        <strong>Outcome Chart:</strong>
        <ul>
          <li v-for="(outcome, range) in player.chart_data" :key="range">
            {{ range }}: {{ outcome }}
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
.player-card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 300px;
}
.placeholder {
  text-align: center;
  color: #888;
}
.card-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}
.card-header h3 {
  margin: 0;
}
.chart ul {
  list-style: none;
  padding: 0;
  margin-top: 0.5rem;
}
</style>