<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

// --- STATE ---
const newRosterName = ref('');
const filterPosition = ref('ALL');
const draggedItem = ref(null);

const roster = ref({
  lineup: { C: null, '1B': null, '2B': null, SS: null, '3B': null, LF: null, CF: null, RF: null, DH: null },
  pitchingStaff: [],
  bench: [],
});

// --- COMPUTED PROPERTIES ---
const allPlayersOnRoster = computed(() => [
    ...Object.values(roster.value.lineup).filter(p => p),
    ...roster.value.pitchingStaff,
    ...roster.value.bench
]);
const playerCount = computed(() => allPlayersOnRoster.value.length);

const availablePlayers = computed(() => {
  return authStore.allPlayers
    .filter(p => !allPlayersOnRoster.value.some(rp => rp.card_id === p.card_id))
    .filter(p => {
        if (filterPosition.value === 'ALL') return true;
        if (filterPosition.value === 'SP') return p.displayPosition === 'SP';
        if (filterPosition.value === 'RP') return p.displayPosition === 'RP';
        if (filterPosition.value === 'P') return p.control !== null;
        if (filterPosition.value === 'DH') return p.displayPosition === 'DH';
        
        // This is the corrected part for position players
        if (p.control !== null) return false; // Not a position player
        const playerPositions = p.fielding_ratings ? Object.keys(p.fielding_ratings) : [];
        if (filterPosition.value === 'LF/RF') return playerPositions.includes('LF') || playerPositions.includes('RF');
        return playerPositions.includes(filterPosition.value);
    })
    .sort((a, b) => (b.points || 0) - (a.points || 0));
});

const starters = computed(() => [
    ...Object.values(roster.value.lineup).filter(p => p),
    ...roster.value.pitchingStaff.filter(p => p.displayPosition === 'SP')
]);
const starterPlayerIds = computed(() => new Set(starters.value.map(p => p.card_id)));

const totalPoints = computed(() => {
  return allPlayersOnRoster.value.reduce((sum, player) => {
    const isStarter = starterPlayerIds.value.has(player.card_id);
    const cost = isStarter ? player.points : Math.round(player.points / 5);
    return sum + cost;
  }, 0);
});

const startingPitchersOnRoster = computed(() => roster.value.pitchingStaff.filter(p => p.displayPosition === 'SP'));
const bullpenOnRoster = computed(() => roster.value.pitchingStaff.filter(p => p.displayPosition === 'RP'));
const benchPlayers = computed(() => roster.value.bench);
const lineupPlayers = computed(() => Object.values(roster.value.lineup).filter(p => p));


// --- METHODS ---
function onDragStart(event, player, from, originalPosition = null) {
  draggedItem.value = { player, from, originalPosition };
  event.dataTransfer.effectAllowed = 'move';
}

function onDrop(event, to, targetPosition = null) {
  if (!draggedItem.value) return;
  const { player, from } = draggedItem.value;
  const playerFromRoster = from !== 'available';

  if (playerCount.value >= 20 && !playerFromRoster) {
    draggedItem.value = null; return;
  }
  
  if (playerFromRoster) removePlayer(player);

  if (to === 'lineup') {
    if (player.control !== null) { if(playerFromRoster) addPlayer(player); draggedItem.value = null; return; }
    const existingPlayer = roster.value.lineup[targetPosition];
    if (existingPlayer) {
        removePlayer(existingPlayer);
        addPlayer(existingPlayer);
    }
    roster.value.lineup[targetPosition] = player;
  } else if (to === 'pitchingStaff') {
    if(player.control === null) { if(playerFromRoster) addPlayer(player); draggedItem.value = null; return; }
    roster.value.pitchingStaff.push(player);
  } else if (to === 'bench') {
     if(player.control !== null) { if(playerFromRoster) addPlayer(player); draggedItem.value = null; return; }
    roster.value.bench.push(player);
  } else if (from === 'available') {
      addPlayer(player);
  }
  
  draggedItem.value = null;
}

function addPlayer(player) {
  if (allPlayersOnRoster.value.some(p => p.name === player.name)) return;

  if (player.control !== null) {
    roster.value.pitchingStaff.push(player);
  } else {
    const p_pos = player.fielding_ratings ? Object.keys(player.fielding_ratings) : [];
    const preferredOrder = ['C', 'SS', '2B', '3B', 'CF', 'LF', 'RF', '1B', 'DH'];
    let placed = false;
    for (const pos of preferredOrder) {
      if (!roster.value.lineup[pos] && p_pos.includes(pos)) {
        roster.value.lineup[pos] = player;
        placed = true;
        break;
      }
    }
    if (!placed) roster.value.bench.push(player);
  }
}

function removePlayer(playerToRemove) {
    roster.value.pitchingStaff = roster.value.pitchingStaff.filter(p => p.card_id !== playerToRemove.card_id);
    roster.value.bench = roster.value.bench.filter(p => p.card_id !== playerToRemove.card_id);
    for (const pos in roster.value.lineup) {
        if (roster.value.lineup[pos]?.card_id === playerToRemove.card_id) {
            roster.value.lineup[pos] = null;
        }
    }
}

async function saveRoster() {
  const rosterData = {
    roster_name: newRosterName.value,
    card_ids: allPlayersOnRoster.value.map(p => p.card_id),
    starter_ids: Array.from(starterPlayerIds.value)
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
    <div class="available-players-section panel">
      <div class="panel-header">
      <div class="debug-panel">
        <strong>Debug: {{ authStore.allPlayers.length }} players loaded from store.</strong>
      </div>
        <h2>Available Players</h2>
        <select v-model="filterPosition">
          <option value="ALL">All Positions</option>
          <option value="SP">SP</option>
          <option value="RP">RP</option>
          <option value="C">C</option>
          <option value="1B">1B</option>
          <option value="2B">2B</option>
          <option value="SS">SS</option>
          <option value="3B">3B</option>
          <option value="LF/RF">LF/RF</option>
          <option value="CF">CF</option>
          <option value="DH">DH-Only</option>
        </select>
      </div>
      <div class="player-list drop-zone" @dragover.prevent @drop="removePlayer(draggedItem.player)">
        <div 
          v-for="player in availablePlayers" 
          :key="player.card_id"
          class="player-item"
          draggable="true"
          @dragstart="onDragStart($event, player, 'available')">
          <span>{{ player.displayName }} ({{ player.displayPosition }})</span>
          <span>{{ player.points }} pts</span>
        </div>
      </div>
    </div>
    
    <div class="roster-section">
        <div class="roster-header">
            <input type="text" v-model="newRosterName" placeholder="Enter Roster Name..." />
            <div class="roster-stats">
                <span>Players: {{ playerCount }} / 20</span>
                <span :class="{ 'over-limit': totalPoints > 5000 }">Points: {{ totalPoints }} / 5000</span>
            </div>
            <button @click="saveRoster">Save Roster</button>
        </div>
        <div class="roster-grid">
            <div class="lineup-panel">
                <h3>Starting Lineup ({{ lineupPlayers.length }}/9)</h3>
                <div class="lineup-grid-positions">
                    <div v-for="(player, pos) in roster.lineup" :key="pos" class="lineup-position drop-zone" @dragover.prevent @drop="onDrop($event, 'lineup', pos)">
                        <strong>{{ pos }}:</strong>
                        <div v-if="player" class="player-chip" draggable="true" @dragstart="onDragStart($event, player, 'lineup', pos)" @click="removePlayer(player)">
                            {{ player.displayName }} <small>({{player.displayPosition}} | {{player.points}} pts)</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="staff-panel">
                <h3>Pitching Staff ({{ roster.pitchingStaff.length }})</h3>
                <div class="staff-area">
                  <strong>Starting Pitchers ({{ startingPitchersOnRoster.length }}/4):</strong>
                  <div class="bench-area drop-zone" @dragover.prevent @drop="onDrop($event, 'pitchingStaff')">
                      <div v-for="p in startingPitchersOnRoster" :key="p.card_id" class="player-chip" draggable="true" @dragstart="onDragStart($event, p, 'pitchingStaff')" @click="removePlayer(p)">
                        {{ p.displayName }} <small>({{p.displayPosition}} | {{p.points}} pts)</small>
                      </div>
                  </div>
                  <strong>Bullpen ({{ bullpenOnRoster.length }}):</strong>
                  <div class="bench-area drop-zone" @dragover.prevent @drop="onDrop($event, 'pitchingStaff')">
                      <div v-for="p in bullpenOnRoster" :key="p.card_id" class="player-chip" draggable="true" @dragstart="onDragStart($event, p, 'pitchingStaff')" @click="removePlayer(p)">
                        {{ p.displayName }} <small>({{p.displayPosition}} | {{p.points}} pts)</small>
                      </div>
                  </div>
                </div>
                <h3>Bench ({{ benchPlayers.length }})</h3>
                <div class="bench-area drop-zone" @dragover.prevent @drop="onDrop($event, 'bench')">
                    <div v-for="p in benchPlayers" :key="p.card_id" class="player-chip" draggable="true" @dragstart="onDragStart($event, p, 'bench')" @click="removePlayer(p)">
                      {{ p.displayName }} <small>({{p.displayPosition}} | {{p.points}} pts)</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.builder-container { display: grid; grid-template-columns: 400px 1fr; grid-template-rows: auto 1fr; gap: 1rem; padding: 1rem; height: calc(100vh - 50px); box-sizing: border-box; }
.available-players-section { grid-row: 1 / 3; display: flex; flex-direction: column; background: #f4f6f8; padding: 1rem; border-radius: 8px; overflow: hidden; }
.roster-section { grid-row: 1 / 3; display: flex; flex-direction: column; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.player-list { flex-grow: 1; overflow-y: auto; border: 1px solid #ddd; background: white; border-radius: 4px; }
.player-item { display: flex; justify-content: space-between; padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #eee; }
.roster-header { display: flex; gap: 1rem; align-items: center; background: #e9ecef; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;}
.roster-header input { flex-grow: 1; padding: 0.75rem; font-size: 1.1rem; }
.roster-stats { font-weight: bold; text-align: center; white-space: nowrap; }
.roster-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1rem; flex-grow: 1; overflow-y: auto; }
.lineup-panel, .staff-panel { background: #f4f6f8; padding: 1rem; border-radius: 8px; display: flex; flex-direction: column; }
.lineup-grid-positions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
.lineup-position { padding: 0.5rem; border: 1px dashed #ccc; border-radius: 4px; min-height: 50px; font-size: 0.9em; }
.staff-area { flex-grow: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.bench-area { border: 1px dashed #ccc; border-radius: 4px; padding: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-content: flex-start; min-height: 50px; }
.player-chip { background-color: #dee2e6; padding: 0.25rem 0.5rem; border-radius: 12px; cursor: grab; font-size: 0.85em; }
.player-chip:hover { background-color: #ffdddd; }
.player-chip small { color: #495057; }
.over-limit { color: #dc3545; }
.drop-zone:hover { border-color: #007bff; }
</style>