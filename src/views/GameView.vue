<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { socket } from '@/services/socket';
import PlayerCard from '@/components/PlayerCard.vue';
import BaseballDiamond from '@/components/BaseballDiamond.vue';

const route = useRoute();
const gameStore = useGameStore();
const authStore = useAuthStore();
const gameId = route.params.id;
const tagUpChoices = ref({});

const selectedCard = ref(null);
const showSubModal = ref(false);
const playerToSubIn = ref(null);
const baserunningChoices = ref({});
// NEW: Local state for the checkbox
const infieldIn = ref(gameStore.gameState?.infieldIn || false);

// NEW: Computed to determine if I am the defensive player RIGHT NOW
const amIDefensivePlayer = computed(() => {
    if (!authStore.user || !gameStore.gameState) return false;
    const offensiveTeam = gameStore.gameState.isTopInning ? gameStore.gameState.awayTeam : gameStore.gameState.homeTeam;
    return authStore.user.userId !== offensiveTeam.userId;
});

const amIOffensivePlayer = computed(() => {
    if (!authStore.user || !gameStore.gameState) return false;
    const offensiveTeam = gameStore.gameState.isTopInning ? gameStore.gameState.awayTeam : gameStore.gameState.homeTeam;
    return authStore.user.userId === offensiveTeam.userId;
});

const canAttemptSteal = computed(() => {
    return amIOffensivePlayer.value && atBatStatus.value === 'pitching';
});

function handleStealAttempt(fromBase) {
    if (!canAttemptSteal.value) return;
    if (confirm(`Are you sure you want to attempt to steal from ${fromBase}B?`)) {
        gameStore.attemptSteal(gameId, fromBase);
    }
}

// NEW: Watch for changes to the checkbox and send to server
watch(infieldIn, (newValue) => {
    if (amIDefensivePlayer.value) {
        gameStore.setDefense(gameId, newValue);
    }
});

// NEW: Watch for updates from the server
watch(() => gameStore.gameState?.infieldIn, (newValue) => {
    infieldIn.value = newValue;
});

const isMyTurn = computed(() => {
  if (!authStore.user || !gameStore.game) return false;
  return Number(authStore.user.userId) === Number(gameStore.game.current_turn_user_id);
});

const atBatStatus = computed(() => gameStore.gameState?.atBatStatus || 'pitching');

const batterLineupInfo = computed(() => {
    if (!gameStore.gameState || !gameStore.lineups.away?.battingOrder) return null;
    const lineup = gameStore.gameState.isTopInning ? gameStore.lineups.away.battingOrder : gameStore.lineups.home.battingOrder;
    if (!lineup || lineup.length === 0) return null;
    const pos = gameStore.gameState.isTopInning ? gameStore.gameState.awayTeam.battingOrderPosition : gameStore.gameState.homeTeam.battingOrderPosition;
    return lineup[pos];
});

const homePitcher = computed(() => gameStore.gameState?.isTopInning ? gameStore.pitcher : gameStore.lineups.home?.startingPitcher);
const awayPitcher = computed(() => !gameStore.gameState?.isTopInning ? gameStore.pitcher : gameStore.lineups.away?.startingPitcher);

const myTeam = computed(() => {
    if (!authStore.user || !gameStore.game) return null;
    return authStore.user.userId === gameStore.game.home_team_user_id ? 'home' : 'away';
});

const myLineup = computed(() => myTeam.value ? gameStore.lineups[myTeam.value] : null);
const myRoster = computed(() => myTeam.value ? gameStore.rosters[myTeam.value] : []);

const myBenchAndBullpen = computed(() => {
    if (!myLineup.value?.battingOrder || !myRoster.value) return [];
    const onFieldIds = new Set(myLineup.value.battingOrder.map(s => s.player.card_id));
    if (myLineup.value.startingPitcher) {
        onFieldIds.add(myLineup.value.startingPitcher.card_id);
    }
    return myRoster.value.filter(p => !onFieldIds.has(p.card_id));
});

const myBench = computed(() => myBenchAndBullpen.value.filter(p => p.control === null));
const myBullpen = computed(() => myBenchAndBullpen.value.filter(p => p.control !== null));

const homeBenchAndBullpen = computed(() => {
    if (!gameStore.lineups.home?.battingOrder || !gameStore.rosters.home) return [];
    const lineupIds = new Set(gameStore.lineups.home.battingOrder.map(s => s.player.card_id));
    if (gameStore.lineups.home.startingPitcher) { lineupIds.add(gameStore.lineups.home.startingPitcher.card_id); }
    return gameStore.rosters.home.filter(p => !lineupIds.has(p.card_id));
});
const awayBenchAndBullpen = computed(() => {
    if (!gameStore.lineups.away?.battingOrder || !gameStore.rosters.away) return [];
    const lineupIds = new Set(gameStore.lineups.away.battingOrder.map(s => s.player.card_id));
    if (gameStore.lineups.away.startingPitcher) { lineupIds.add(gameStore.lineups.away.startingPitcher.card_id); }
    return gameStore.rosters.away.filter(p => !lineupIds.has(p.card_id));
});

const homeBench = computed(() => homeBenchAndBullpen.value.filter(p => p.control === null));
const homeBullpen = computed(() => homeBenchAndBullpen.value.filter(p => p.displayPosition === 'RP'));
const awayBench = computed(() => awayBenchAndBullpen.value.filter(p => p.control === null));
const awayBullpen = computed(() => awayBenchAndBullpen.value.filter(p => p.displayPosition === 'RP'));
const outfieldDefense = computed(() => {
    if (!gameStore.gameState || !gameStore.lineups) return 0;
    const defensiveLineup = gameStore.gameState.isTopInning ? gameStore.lineups.home : gameStore.lineups.away;
    if (!defensiveLineup?.battingOrder) return 0;
    return defensiveLineup.battingOrder
        .filter(spot => ['LF', 'CF', 'RF'].includes(spot.position))
        .reduce((sum, spot) => {
            const rating = spot.player.fielding_ratings[spot.position] || 0;
            return sum + rating;
        }, 0);
});

function handlePitch() { gameStore.submitPitch(gameId); }
function handleSwing() { gameStore.submitSwing(gameId); }
function confirmBaserunning() {
    gameStore.advanceRunners(gameId, baserunningChoices.value);
    baserunningChoices.value = {};
}
function confirmTagUp() {
    gameStore.submitTagUp(gameId, tagUpChoices.value);
    tagUpChoices.value = {}; // Reset choices
}

function selectPlayerToSubIn(player) {
    if (playerToSubIn.value?.card_id === player.card_id) {
        playerToSubIn.value = null;
    } else {
        playerToSubIn.value = player;
    }
}
async function executeSubstitution(playerOut, position) {
    if (!playerToSubIn.value) {
        selectedCard.value = playerOut;
        return;
    }
    
    const isIncomingPlayerPitcher = playerToSubIn.value.control !== null;
    const isOutgoingPlayerPitcher = position === 'P';

    if (isIncomingPlayerPitcher !== isOutgoingPlayerPitcher) {
        alert('You can only substitute a pitcher for a pitcher, or a position player for a position player.');
        playerToSubIn.value = null;
        return;
    }

    await gameStore.submitSubstitution(gameId, {
        playerInId: playerToSubIn.value.card_id,
        playerOutId: playerOut.card_id,
        position: position
    });

    playerToSubIn.value = null;
    showSubModal.value = false;
}

onMounted(() => {
  gameStore.fetchGame(gameId);
  socket.connect();
  socket.emit('join-game-room', gameId);
  socket.on('game-updated', () => { gameStore.fetchGame(gameId); });
});

onUnmounted(() => {
  socket.off('game-updated');
  socket.disconnect();
});
</script>

<template>
  <div v-if="selectedCard" class="modal-overlay" @click="selectedCard = null">
    <div @click.stop><PlayerCard :player="selectedCard" /></div>
  </div>

  <div class="game-container" v-if="gameStore.gameState && gameStore.lineups?.home && gameStore.lineups?.away">
    <div class="side-panels">
        <div class="lineup-panel">
            <h3>Away Lineup</h3>
            <ol><li v-for="(spot, index) in gameStore.lineups.away.battingOrder" :key="spot.player.card_id" :class="{ 'now-batting': gameStore.gameState.isTopInning && index === gameStore.gameState.awayTeam.battingOrderPosition, 'sub-target': playerToSubIn && myTeam === 'away' && isMyTurn }" @click="executeSubstitution(spot.player, spot.position)"> {{ spot.player.displayName }} ({{ spot.position }}) </li></ol>
            <div v-if="awayPitcher" class="pitcher-info" :class="{'sub-target': playerToSubIn && myTeam === 'away' && isMyTurn}" @click="executeSubstitution(awayPitcher, 'P')"> <hr /><strong>Pitching:</strong> {{ awayPitcher.name }} </div>
            <div v-if="awayBullpen.length > 0"> <hr /><strong>Bullpen:</strong> <ul><li v-for="p in awayBullpen" :key="p.card_id" @click="isMyTurn && selectPlayerToSubIn(p)" :class="{selected: playerToSubIn?.card_id === p.card_id}">{{ p.displayName }} ({{p.ip}} IP)</li></ul> </div>
            <div v-if="awayBench.length > 0"> <hr /><strong>Bench:</strong> <ul><li v-for="p in awayBench" :key="p.card_id" @click="isMyTurn && selectPlayerToSubIn(p)" :class="{selected: playerToSubIn?.card_id === p.card_id}">{{ p.displayName }} ({{p.displayPosition}})</li></ul> </div>
        </div>
    </div>
    
    <div class="main-view">
        <div class="at-bat-display">
          <PlayerCard :player="gameStore.pitcher" role="Pitcher" />
          <div class="vs-area">
            <div class="vs">VS</div>
            <div v-if="gameStore.gameState.pitchRollResult">
            <div v-if="amIDefensivePlayer" class="pitch-result">
                Pitch Roll: {{ gameStore.gameState.pitchRollResult.roll }}<br/>
                Advantage: <strong>{{ gameStore.gameState.pitchRollResult.advantage.toUpperCase() }}</strong>
            </div>
            <div v-else class="pitch-result">
                Pitch has been thrown!
            </div>
        </div>
        <div v-if="gameStore.gameState.swingRollResult" class="swing-result">
            Swing Roll: {{ gameStore.gameState.swingRollResult.roll }}<br/>
            Outcome: <strong>{{ gameStore.gameState.swingRollResult.outcome }}</strong>
        </div>
        </div>
          <PlayerCard :player="gameStore.batter" role="Batter" :battingOrderPosition="gameStore.gameState.isTopInning ? gameStore.gameState.awayTeam.battingOrderPosition : gameStore.gameState.homeTeam.battingOrderPosition" :defensivePosition="batterLineupInfo?.position" />
        </div>
        <div class="scoreboard">
            <div class="team-score">Away: {{ gameStore.gameState.awayScore }}</div>
            <div class="inning-display"> <div class="inning-arrow" :class="{ top: gameStore.gameState.isTopInning }">▲</div> <div>{{ gameStore.gameState.inning }}</div> <div class="inning-arrow" :class="{ bottom: !gameStore.gameState.isTopInning }">▼</div> </div>
            <div class="team-score">Home: {{ gameStore.gameState.homeScore }}</div>
            <div class="outs-display">Outs: {{ gameStore.gameState.outs }}</div>
        </div>
        <div class="diamond-area">
            <div class="outfield-defense" v-if="atBatStatus === 'baserunning-decision'"> Outfield Defense Total: +{{ outfieldDefense }} </div>
            <BaseballDiamond 
            :bases="gameStore.gameState.bases" 
            :can-steal="canAttemptSteal"
            @attempt-steal="handleStealAttempt"
        />
        </div>
        <div class="actions">
    <div v-if="atBatStatus === 'baserunning-decision'"> </div>
    <div v-else-if="atBatStatus === 'tag-up-decision'">
        <div v-if="isMyTurn">
          <h4>Tag-Up Decisions:</h4>
          <div v-for="decision in gameStore.gameState.tagUpDecisions.runners" :key="decision.from">
              Runner from {{ decision.from }}B ({{ decision.runner.name }} - Speed {{ decision.runner.speed }}):
              <label><input type="checkbox" v-model="tagUpChoices[decision.from]"> Send Runner</label>
          </div>
          <button @click="confirmTagUp">Confirm Decisions</button>
        </div>
        <div v-else class="turn-indicator">Waiting for opponent to make tag-up decision...</div>
    </div>
    <div v-else-if="!isMyTurn" class="turn-indicator">Waiting for opponent...</div>
    <div v-else>
        <div v-if="atBatStatus === 'pitching'" class="button-group">
            <button @click="handlePitch()">Roll for Pitch</button>
            <button @click="handlePitch('intentional_walk')">Intentionally Walk</button>
        </div>
        <div v-if="atBatStatus === 'swinging'" class="button-group">
            <button @click="handleSwing()">Roll for Swing</button>
            <button @click="handleSwing('bunt')">Bunt</button>
    </div>
</div>
        <div v-if="amIDefensivePlayer" class="defense-strategy">
            <label>
                <input type="checkbox" v-model="infieldIn" />
                Infield In
            </label>
        </div>
            <div v-if="atBatStatus === 'baserunning-decision'">
                <div v-if="isMyTurn">
                  <h4>Baserunning Decisions:</h4>
                  <div v-for="decision in gameStore.gameState.baserunningDecisions.runners" :key="decision.from"> Runner from {{ decision.from }}B ({{ decision.runner.name }} - Speed {{ decision.runner.speed }}): <label><input type="checkbox" v-model="baserunningChoices[decision.from]"> Send Runner</label> </div>
                  <button @click="confirmBaserunning">Confirm Decisions</button>
                </div>
                <div v-else class="turn-indicator">Waiting for opponent to make baserunning decision...</div>
            </div>
            <div v-else-if="!isMyTurn" class="turn-indicator">Waiting for opponent...</div>
        </div>
        <div class="event-log">
            <h2>Game Log</h2>
            <ul><li v-for="(event, index) in gameStore.gameEvents" :key="index">{{ event.log_message }}</li></ul>
        </div>
    </div>

    <div class="side-panels">
        <div class="lineup-panel">
            <h3>Home Lineup</h3>
            <ol><li v-for="(spot, index) in gameStore.lineups.home.battingOrder" :key="spot.player.card_id" :class="{ 'now-batting': !gameStore.gameState.isTopInning && index === gameStore.gameState.homeTeam.battingOrderPosition, 'sub-target': playerToSubIn && myTeam === 'home' && isMyTurn }" @click="executeSubstitution(spot.player, spot.position)"> {{ spot.player.displayName }} ({{ spot.position }}) </li></ol>
             <div v-if="homePitcher" class="pitcher-info" :class="{'sub-target': playerToSubIn && myTeam === 'home' && isMyTurn}" @click="executeSubstitution(homePitcher, 'P')"> <hr /><strong>Pitching:</strong> {{ homePitcher.name }} </div>
            <div v-if="homeBullpen.length > 0"> <hr /><strong>Bullpen:</strong> <ul><li v-for="p in homeBullpen" :key="p.card_id" @click="isMyTurn && selectPlayerToSubIn(p)" :class="{selected: playerToSubIn?.card_id === p.card_id}">{{ p.displayName }} ({{p.ip}} IP)</li></ul> </div>
            <div v-if="homeBench.length > 0"> <hr /><strong>Bench:</strong> <ul><li v-for="p in homeBench" :key="p.card_id" @click="isMyTurn && selectPlayerToSubIn(p)" :class="{selected: playerToSubIn?.card_id === p.card_id}">{{ p.displayName }} ({{p.displayPosition}})</li></ul> </div>
        </div>
    </div>
  </div>
  <div v-else class="loading-container"><p>Loading game...</p></div>
</template>

<style scoped>
.game-container { display: grid; grid-template-columns: 1fr 2.5fr 1fr; gap: 1rem; max-width: 1600px; margin: 1rem auto; font-family: sans-serif; }
.now-batting { background-color: #fff8e1; font-weight: bold; }
.at-bat-display { display: flex; justify-content: center; align-items: flex-start; gap: 2rem; margin-bottom: 1.5rem; }
.vs-area { text-align: center; padding-top: 5rem; position: relative; }
.actions { text-align: center; margin-bottom: 1.5rem; min-height: 50px; }
.vs { font-size: 2.5rem; font-weight: bold; color: #888; }
.pitch-result, .swing-result { margin-top: 1rem; padding: 0.5rem; border-radius: 4px; }
.pitch-result { background: #fff8e1; border: 1px solid #ffecb3; }
.swing-result { background: #e7f5ff; border: 1px solid #b3e0ff; }
.scoreboard { display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto; padding: 1rem; background-color: #343a40; color: white; border-radius: 8px; margin-bottom: 1.5rem; text-align: center; }
.team-score { font-size: 2rem; font-weight: bold; }
.inning-display { grid-column: 2 / 3; display: flex; align-items: center; gap: 1rem; font-size: 1.5rem; }
.inning-arrow { opacity: 0.2; }
.inning-arrow.top, .inning-arrow.bottom { opacity: 1; }
.outs-display { grid-column: 1 / 4; font-size: 1.2rem; margin-top: 0.5rem; }
.actions button { padding: 0.75rem 1.5rem; font-size: 1.2rem; cursor: pointer; }
.actions button:disabled { cursor: not-allowed; background-color: #ccc; }
.turn-indicator { font-style: italic; color: #555; padding-top: 1rem; }
.side-panels { display: flex; flex-direction: column; gap: 1rem; }
.lineup-panel { background: #f9f9f9; padding: 1rem; border-radius: 8px; }
.lineup-panel h3 { margin-top: 0; }
.lineup-panel ol, .lineup-panel ul { padding-left: 20px; margin: 0.5rem 0; }
.lineup-panel li { cursor: pointer; padding: 2px 0; }
.lineup-panel li:hover { text-decoration: underline; }
.pitcher-info { font-weight: bold; margin-top: 0.5rem; }
.event-log { flex-grow: 1; background: #f9f9f9; padding: 1rem; border-radius: 8px; display: flex; flex-direction: column; }
.event-log ul { list-style: none; padding: 0; min-height: 300px; overflow-y: auto; flex-grow: 1; }
.event-log li { padding: 0.5rem; border-bottom: 1px solid #eee; }
.loading-container { text-align: center; padding: 5rem; font-size: 1.5rem; }
.diamond-area { position: relative; }
.outfield-defense { position: absolute; top: 0; left: 0; background: rgba(0,0,0,0.5); color: white; padding: 4px; border-radius: 4px; font-size: 0.8em; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-overlay > div { max-width: 320px; }
.actions .sub-btn { font-size: 0.8rem; padding: 0.4rem 0.8rem; position: absolute; top: 0; right: 0; }
.sub-modal { background: white; padding: 2rem; border-radius: 8px; width: 800px; max-width: 90vw; }
.sub-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
.sub-list { height: 400px; overflow-y: auto; border: 1px solid #ccc; border-radius: 4px; }
.sub-item-header { background-color: #eee; padding: 0.5rem; font-weight: bold; position: sticky; top: 0; }
.sub-item { padding: 0.5rem; border-bottom: 1px solid #eee; cursor: pointer; }
.sub-item:hover { background-color: #f0f8ff; }
.sub-item.available:hover { background-color: #eef8ff; }
.sub-item.available.selected { background-color: #007bff; color: white; }
.selection-info { text-align: center; background: #fff8e1; padding: 0.5rem; border-radius: 4px; }
.close-btn { margin-top: 1rem; }
.lineup-panel li.sub-target { background-color: #ffc107; cursor: crosshair; }
.pitcher-info.sub-target { background-color: #ffc107; cursor: crosshair; }
.side-panels ul li.selected { background-color: #007bff; color: white; }
.defense-strategy {
  margin-bottom: 1rem;
  font-weight: bold;
}
.button-group button {
    margin: 0 0.5rem;}
</style>