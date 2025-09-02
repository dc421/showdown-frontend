<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { socket } from '@/services/socket';
import PlayerCard from '@/components/PlayerCard.vue';
import Linescore from '@/components/Linescore.vue';
import BaseballDiamond from '@/components/BaseballDiamond.vue';

const showSubModal = ref(false);
const route = useRoute();
const gameStore = useGameStore();
const authStore = useAuthStore();
const gameId = route.params.id;
const choices = ref({});

const selectedCard = ref(null);
const playerToSubIn = ref(null);
const baserunningChoices = ref({});
// NEW: Local state for the checkbox

const infieldIn = ref(gameStore.gameState?.infieldIn || false);


const REPLACEMENT_HITTER = { card_id: 'replacement_hitter', displayName: 'Replacement Hitter', control: null };
const REPLACEMENT_PITCHER = { card_id: 'replacement_pitcher', displayName: 'Replacement Pitcher', control: 0, ip: 1 };

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

const homePitcher = computed(() => gameStore.gameState?.isTopInning ? gameStore.pitcher : gameStore.lineups.home?.startingPitcher);
const awayPitcher = computed(() => !gameStore.gameState?.isTopInning ? gameStore.pitcher : gameStore.lineups.away?.startingPitcher);

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

// NEW: Computed to determine if I am the defensive player RIGHT NOW

const amIDefensivePlayer = computed(() => {
  if (!authStore.user || !gameStore.game) return false;
  // If it's my turn and the status is 'pitching', I must be on defense.
  // If it's NOT my turn and the status is 'swinging', I must be on defense.
  return (isMyTurn.value && atBatStatus.value === 'pitching') || 
         (!isMyTurn.value && atBatStatus.value === 'swinging');
});


const amIOffensivePlayer = computed(() => {
    if (!authStore.user || !gameStore.gameState) return false;
    return !amIDefensivePlayer.value;
});

const canAttemptSteal = computed(() => {
    // The steal option should only be available during the 'swinging' phase
    return amIOffensivePlayer.value && atBatStatus.value === 'swinging';
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

// in GameView.vue
const catcherArm = computed(() => {
    if (!gameStore.gameState || !gameStore.lineups) return 0;
    const defensiveLineup = gameStore.gameState.isTopInning ? gameStore.lineups.home.battingOrder : gameStore.lineups.away.battingOrder;
    if (!defensiveLineup) return 0;

    const catcher = defensiveLineup.find(spot => spot.position === 'C');
    // The rating is stored in the fielding_ratings object under the 'C' key
    return catcher?.player.fielding_ratings['C'] || 0;
});

// --- NEW: Computed properties to get team color data ---
const homeTeamColors = computed(() => {
    return {
        primary: gameStore.teams?.home?.primary_color || '#343a40',
        secondary: gameStore.teams?.home?.secondary_color || '#ffffff'
    }
});
const awayTeamColors = computed(() => {
    return {
        primary: gameStore.teams?.away?.primary_color || '#343a40',
        secondary: gameStore.teams?.away?.secondary_color || '#ffffff'
    }
});

const pitcherTeamColors = computed(() => gameStore.gameState?.isTopInning ? homeTeamColors.value : awayTeamColors.value);
const batterTeamColors = computed(() => gameStore.gameState?.isTopInning ? awayTeamColors.value : homeTeamColors.value);


function handleInitiateSteal() {
    gameStore.initiateSteal(gameId);
}
function handlePitch(action = null) {
  gameStore.submitPitch(gameId, action);
}
function handleSwing(action = null) {
  gameStore.submitSwing(gameId, action);
}
// in GameView.vue
function handleThrowForSteal() {
  console.log('1. "Roll for Throw" button was clicked.');
  gameStore.resolveSteal(gameId);
}
function confirmBaserunning() {
  console.log('1. "Confirm Decisions" button clicked. Sending:', baserunningChoices.value);
  gameStore.advanceRunners(gameId, baserunningChoices.value);
  baserunningChoices.value = {};
}
function confirmTagUp() {
    gameStore.submitTagUp(gameId, tagUpChoices.value);
    tagUpChoices.value = {}; // Reset choices
}
function confirmOffensiveDecisions() {
    gameStore.submitBaserunningDecisions(gameId, baserunningChoices.value);
    baserunningChoices.value = {};
}
function makeDefensiveThrow(base) {
    gameStore.resolveDefensiveThrow(gameId, base);
}

function handleStealAttempt(fromBase) {
  // --- FINAL DEBUG LOG ---
  console.log('--- STEAL ATTEMPT HANDLER in GameView ---');
  console.log('Received fromBase value:', fromBase, '(Type:', typeof fromBase, ')');

  if (!canAttemptSteal.value) {
      console.log('Steal aborted: canAttemptSteal is false.');
      return;
  }
  if (confirm(`Are you sure you want to attempt to steal from base ${fromBase}?`)) {
      gameStore.attemptSteal(gameId, fromBase);
  }
}

// in GameView.vue <script setup>

function handleInfieldInDecision(sendRunner) {

    gameStore.submitInfieldInDecision(gameId, sendRunner);

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

function selectPlayerToSubIn(player) {
    if (!isMyTurn.value) return;
    if (playerToSubIn.value?.card_id === player.card_id) {
        playerToSubIn.value = null; // Deselect
    } else {
        playerToSubIn.value = player;
    }
}
async function executeSubstitution(playerOut, position) {
    if (!isMyTurn.value || !playerToSubIn.value) {
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
}
// --- NEW: On-Deck Logic ---
const defensiveTeamKey = computed(() => gameStore.gameState?.isTopInning ? 'homeTeam' : 'awayTeam');
const defensiveNextBatterIndex = computed(() => {
    if (!gameStore.gameState) return -1;
    return gameStore.gameState[defensiveTeamKey.value].battingOrderPosition;
});


// in GameView.vue
onMounted(async () => {
  await gameStore.fetchGame(gameId);
  
  // --- THIS IS THE DEBUG LOG ---
  console.log('--- GameView Mounted: Checking Store Data ---');
  console.log('gameState:', gameStore.gameState);
  console.log('gameEvents:', gameStore.gameEvents);

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
  <div v-if="showSubModal" class="modal-overlay" @click="showSubModal = false">
    <div class="sub-modal" @click.stop>
      <h2>Make a Substitution</h2>
      <div class="sub-panels">
        <div class="sub-panel">
          <h3>On the Field</h3>
          <div class="sub-list" v-if="myLineup">
            <div class="sub-item-header">Pitcher</div>
            <div class="sub-item" @click="executeSubstitution(myLineup.startingPitcher, 'P')">{{ myLineup.startingPitcher?.name }}</div>
            <div class="sub-item-header">Batting Order</div>
            <div v-for="spot in myLineup.battingOrder" :key="spot.player.card_id" class="sub-item" @click="executeSubstitution(spot.player, spot.position)">
                {{ spot.player.displayName }} ({{ spot.position }})
            </div>
          </div>
        </div>
        <div class="sub-panel">
          <h3>Available from Bench/Bullpen</h3>
          <p v-if="playerToSubIn" class="selection-info">Selected: <strong>{{ playerToSubIn.displayName }}</strong></p>
          <div class="sub-list">
            <div class="sub-item-header">Bullpen</div>
            <div v-for="p in myBullpen" :key="p.card_id" class="sub-item available" @click="selectPlayerToSubIn(p)" :class="{selected: playerToSubIn?.card_id === p.card_id}">{{ p.displayName }}</div>
            <div class="sub-item-header">Bench</div>
            <div v-for="p in myBench" :key="p.card_id" class="sub-item available" @click="selectPlayerToSubIn(p)" :class="{selected: playerToSubIn?.card_id === p.card_id}">{{ p.displayName }}</div>
          </div>
        </div>
      </div>
      <button @click="showSubModal = false" class="close-btn">Cancel</button>
    </div>
  </div>

  <div v-if="selectedCard" class="modal-overlay" @click="selectedCard = null">
    <div @click.stop><PlayerCard :player="selectedCard" /></div>
  </div>

  <div class="game-container" v-if="gameStore.gameState && gameStore.lineups?.home && gameStore.lineups?.away">
    <div class="side-panels">
        <div class="lineup-panel">
            <h3 :style="{ color: awayTeamColors.primary}">
              <img v-if="gameStore.teams.away" :src="gameStore.teams.away.logo_url" class="lineup-logo" />
              {{gameStore.teams.away.city}} Lineup
            </h3>
            <ol>
            <li v-for="(spot, index) in gameStore.lineups.away.battingOrder" :key="spot.player.card_id" :class="{ 
                      'now-batting': gameStore.gameState.isTopInning && index === gameStore.gameState.awayTeam.battingOrderPosition,
                      'next-up': !gameStore.gameState.isTopInning && index === defensiveNextBatterIndex,
                      'sub-target': playerToSubIn && myTeam === 'away' 
                  }" @click="selectedCard = spot.player"> {{ index + 1 }}. {{ spot.player.displayName }} ({{ spot.position }}) </li></ol>
            <div v-if="awayPitcher" class="pitcher-info"> <hr /><strong :style="{ color: awayTeamColors.primary}">Pitching:</strong> {{ awayPitcher.name }} </div>
            <div v-if="awayBullpen.length > 0"> <hr /><strong :style="{ color: awayTeamColors.primary}">Bullpen:</strong> <ul><li v-for="p in awayBullpen" :key="p.card_id" @click="selectedCard = p">{{ p.displayName }} ({{p.ip}} IP)</li></ul> </div>
            <div v-if="awayBench.length > 0"> <hr /><strong :style="{ color: awayTeamColors.primary}">Bench:</strong> <ul><li v-for="p in awayBench" :key="p.card_id" @click="selectedCard = p">{{ p.displayName }} ({{p.displayPosition}})</li></ul> </div>
        </div>
    </div>
    
    <div class="main-view">
    <div class="at-bat-display">
          <PlayerCard 
            :player="gameStore.pitcher" 
            role="Pitcher" 
            :has-advantage="atBatStatus === 'swinging' ? gameStore.gameState.pitchRollResult?.advantage === 'pitcher' : null"
            :primary-color="pitcherTeamColors.primary"
          />
          <div class="vs-area">
          <div class="action-box">
        <!-- Show button if it's the defensive player's turn to pitch -->
        <button class="action-button tactile-button" v-if="atBatStatus === 'pitching'" @click="handlePitch()"><strong>ROLL FOR PITCH</strong></button>
        
        <div v-else-if="gameStore.gameState.pitchRollResult" class="result-box" :style="{ backgroundColor: pitcherTeamColors.primary, borderColor: pitcherTeamColors.secondary }">
                Pitch: {{ gameStore.gameState.pitchRollResult.roll }}
              </div>
              </div>
              <div class="vs">VS</div>

    <div class="action-box">
              <button v-if="isMyTurn && atBatStatus === 'swinging' && !amIDefensivePlayer" @click="handleSwing()">Roll for Swing</button>
             <!-- <div v-else-if="atBatStatus === 'pitching' && gameStore.gameState.swingRollResult" class="result-box" :style="{ backgroundColor: batterTeamColors.primary, borderColor: batterTeamColors.secondary }"> -->
             <!--   Swing: <strong>{{ gameStore.gameState.swingRollResult.roll }}</strong> | <strong class="outcome-text">{{ gameStore.gameState.swingRollResult.outcome }}</strong> -->
             <!-- </div> -->
            </div>
  <div v-if="gameStore.gameState.stealRollResult" class="steal-result">
    Catcher Throw: {{ gameStore.gameState.stealRollResult.total }}<br/>
    (Arm {{ gameStore.gameState.stealRollResult.catcherArm }} + Roll {{ gameStore.gameState.stealRollResult.throwRoll }})<br/>
    Outcome: <strong>{{ gameStore.gameState.stealRollResult.outcome }}</strong>
</div>
          </div>
          <PlayerCard 
            :player="gameStore.batter" 
            role="Batter" 
            :has-advantage="atBatStatus === 'swinging' ? gameStore.gameState.pitchRollResult?.advantage === 'batter' : null"
            :primary-color="batterTeamColors.primary"
            :battingOrderPosition="gameStore.gameState.isTopInning ? gameStore.gameState.awayTeam.battingOrderPosition : gameStore.gameState.homeTeam.battingOrderPosition"
            :defensivePosition="batterLineupInfo?.position"
          />
        </div>
        <div class="diamond-area">
            <div class="outfield-defense" v-if="atBatStatus === 'baserunning-decision'"> Outfield Defense Total: +{{ outfieldDefense }} </div>
            <BaseballDiamond 
    :bases="gameStore.gameState.bases" 
    :can-steal="canAttemptSteal"
    :catcherArm="catcherArm"
    :at-bat-status="atBatStatus"
    @attempt-steal="handleStealAttempt"
/>
        </div>
        <div class="actions">
        <div v-if="atBatStatus === 'steal-decision' && isMyTurn">
          <h4>Steal Decisions:</h4>
          <div v-for="decision in gameStore.gameState.currentPlay.decisions" :key="decision.from">
            {{ decision.runner.name }} from {{decision.from}}B (Speed {{ decision.runner.speed }}):
            <label><input type="checkbox" v-model="baserunningChoices[decision.from]"> Send</label>
          </div>
          <button @click="confirmOffensiveDecisions">Attempt Steal</button>
      </div>
      <div v-if="atBatStatus === 'defensive-steal-throw'">
                <div v-if="isMyTurn">
                    <h4>Steal Attempt In Progress!</h4>
                    <p>{{ gameStore.gameState.stealAttempt.runner.name }} is attempting to steal!</p>
                    <button @click="handleThrowForSteal">Roll for Throw</button>
                </div>
                <div v-else class="turn-indicator">Waiting for the defense to make the throw...</div>
            </div>
            <div class="actions-main">
              <div v-if="gameStore.gameState.gameOver" class="game-over">
                <h2>GAME OVER</h2>
                <h3>{{ gameStore.gameState.winningTeam.toUpperCase() }} TEAM WINS!</h3>
              </div>
              <div v-else-if="atBatStatus === 'offensive-baserunning-decision'">
    <div v-if="isMyTurn">
      <h4>Baserunning Decisions:</h4>
      <div v-for="decision in gameStore.gameState.currentPlay.decisions" :key="decision.from">
          Runner from {{ decision.from }}B ({{ decision.runner.name }} - Speed {{ decision.runner.speed }}):
          <label><input type="checkbox" v-model="baserunningChoices[decision.from]"> Send</label>
      </div>
      <button @click="confirmOffensiveDecisions">Confirm Decisions</button>
    </div>
    <div v-else class="turn-indicator">Waiting for opponent to make baserunning decision...</div>
</div>
    <div v-else-if="atBatStatus === 'defensive-throw-decision'">
        <div v-if="isMyTurn">
            <h4>Defensive Throw Decision</h4>
            <p>Choose where to make the play:</p>
            <div v-for="(shouldSend, fromBase) in gameStore.gameState.currentPlay.choices" :key="fromBase">
                <button v-if="shouldSend" @click="makeDefensiveThrow(fromBase == 1 ? 3 : 4)">
                    Throw to {{ fromBase == 1 ? '3rd' : 'Home' }}
                </button>
            </div>
        </div>
        <div v-else class="turn-indicator">Waiting for opponent...</div>
    </div>
              <div v-else-if="atBatStatus === 'tag-up-decision'">
                  <div v-if="isMyTurn">
                    <h4>Tag-Up Decisions:</h4>
                    <div v-for="decision in gameStore.gameState.tagUpDecisions.runners" :key="decision.from"> Runner from {{ decision.from }}B ({{ decision.runner.name }} - Speed {{ decision.runner.speed }}): <label><input type="checkbox" v-model="tagUpChoices[decision.from]"> Send Runner</label> </div>
                    <button @click="confirmTagUp">Confirm Decisions</button>
                  </div>
                  <div v-else class="turn-indicator">Waiting for opponent to make tag-up decision...</div>
              </div>
              <div v-else-if="atBatStatus === 'infield-in-decision'">
                  <div v-if="isMyTurn">
                    <h4>Infield In: Play at the Plate</h4>
                    <p>Runner on third ({{ gameStore.gameState.infieldInDecision.runner.name }} - Speed {{ gameStore.gameState.infieldInDecision.runner.speed }}). What's the call?</p>
                    <button @click="handleInfieldInDecision(true)">Send Runner Home</button>
                    <button @click="handleInfieldInDecision(false)">Hold Runner at Third</button>
                  </div>
                  <div v-else class="turn-indicator">Waiting for opponent to make the call...</div>
              </div>
              <div v-if="!isMyTurn" class="turn-indicator">Waiting for opponent...</div>
  <div v-else>
          <div v-if="atBatStatus === 'pitching'" class="button-group">
              <button class="action-button tactile-button" @click="handlePitch('intentional_walk')">Intentional Walk</button>
              <button v-if="amIOffensivePlayer" @click="handleInitiateSteal()">Attempt Steal</button>
          </div>
      <div v-if="atBatStatus === 'swinging'" class="button-group">
          <button @click="handleSwing('bunt')">Bunt</button>
      </div>
  </div>
</div>
            <div class="actions-secondary">
                <button @click="showSubModal = true" class="sub-btn" v-if="myLineup">Substitutions</button>
                <div v-if="amIDefensivePlayer && atBatStatus === 'pitching'" class="defense-strategy"> <label> <input type="checkbox" v-model="infieldIn" /> Infield In </label> </div>
            </div>
        </div>
        <div class="event-log">
            <h2>Game Log</h2>
            <ul><li v-for="(event, index) in gameStore.gameEvents" :key="index">{{ event.log_message }}</li></ul>
        </div>
    </div>
    <div class="side-panels">
        <div class="lineup-panel">
            <h3 :style="{ color: homeTeamColors.primary }">
              <img v-if="gameStore.teams.home" :src="gameStore.teams.home.logo_url" class="lineup-logo" />
              {{gameStore.teams.home.city}} Lineup
            </h3>
            <ol><li v-for="(spot, index) in gameStore.lineups.home.battingOrder" :key="spot.player.card_id" :class="{ 
                      'now-batting': !gameStore.gameState.isTopInning && index === gameStore.gameState.homeTeam.battingOrderPosition,
                      'next-up': gameStore.gameState.isTopInning && index === defensiveNextBatterIndex,
                      'sub-target': playerToSubIn && myTeam === 'home' 
                  }" @click="executeSubstitution(spot.player, spot.position)"> {{ index + 1 }}. {{ spot.player.displayName }} ({{ spot.position }}) </li></ol>
             <div v-if="homePitcher" class="pitcher-info" :class="{'sub-target': playerToSubIn && myTeam === 'home'}" @click="executeSubstitution(homePitcher, 'P')"> <hr /><strong :style="{ color: homeTeamColors.primary }">Pitching:</strong> {{ homePitcher.name }} </div>
            <div v-if="homeBullpen.length > 0"> <hr /><strong :style="{ color: homeTeamColors.primary }">Bullpen:</strong> <ul><li v-for="p in homeBullpen" :key="p.card_id" @click="selectPlayerToSubIn(p)" :class="{selected: playerToSubIn?.card_id === p.card_id}">{{ p.displayName }} ({{p.ip}} IP)</li></ul> </div>
            <div v-if="homeBench.length > 0"> <hr /><strong :style="{ color: homeTeamColors.primary }">Bench:</strong> <ul><li v-for="p in homeBench" :key="p.card_id" @click="selectPlayerToSubIn(p)" :class="{selected: playerToSubIn?.card_id === p.card_id}">{{ p.displayName }} ({{p.displayPosition}})</li></ul> </div>
        </div>
    </div>
  </div>
  <div v-else class="loading-container"><p>Loading game...</p></div>
</template>

<style scoped>
.game-container { display: grid; grid-template-columns: 1fr 2.5fr 1fr; gap: 1rem; max-width: 1600px; margin: 1rem auto; font-family: sans-serif; }
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
.turn-indicator { font-style: italic; color: #555; padding-top: 1rem; }
.side-panels { display: flex; flex-direction: column; gap: 1rem; }
.lineup-panel { background: #f9f9f9; padding: 1rem; border-radius: 8px; }
.lineup-panel h3 { margin-top: 0; }
.lineup-panel ol { padding-left: 0px; margin: 0.5rem 0; list-style: none;}
.lineup-panel ul { padding-left: 17px; margin: 0.5rem 0; list-style: none;}
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
.lineup-panel li.sub-target, .pitcher-info.sub-target { background-color: #ffc107; cursor: crosshair; }
.side-panels ul li.selected { background-color: #007bff; color: white; }
.pitcher-info.sub-target { background-color: #ffc107; cursor: crosshair; }
.defense-strategy {
  margin-top: .25rem;
  margin-bottom: 1rem;
  font-weight: bold;
}
.button-group button {
    margin: 0 0.5rem;}
    .game-over {
  text-align: center;
  padding: 1rem;
  background-color: #28a745;
  color: white;
  border-radius: 8px;
}
.swing-result .outcome-text {
  font-size: 2rem; /* Or any size you like */
  color: #0056b3; /* A slightly darker blue for emphasis */
}
.game-over h2 {
  margin: 0;
}
.action-box {
  min-height: 50px;
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}
.steal-result {
  margin-top: 1rem;
  background: #ffe3e3; /* Reddish for a defensive play */
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ffc107;
}
.lineup-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0;
}
.lineup-logo {
  height: 24px;
  width: 24px;
  border-radius: 50%;
}
.vs-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 1rem; /* Reduced padding */
}
.vs {
  font-size: 2rem;
  font-weight: bold;
  color: #888;
  margin: 0.5rem 0;
}
/* This is the base style for ALL action buttons */
.actions button {
  padding: 0.75rem 1.5rem;
  font-size: 5rem;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
  margin: 0 0.5rem;
}

/* This is the specific style for our "tactile" buttons */
.actions .tactile-button {
  /* Size and Shape */
  padding: .5rem 1rem;
  font-size: 1rem;
  border-radius: 5px; /* Rounded edges */

  /* 3D Effect */
  
  color: #3A3A3A;
  border: 1px solid #495057;

  transition: all 0.1s ease-in-out;
  cursor: pointer; /* <-- THIS IS THE NEW LINE */
}

.actions .tactile-button:hover {
  background-color: #E4E4E4; /* Slightly lighter on hover */
}

.actions .tactile-button:active {
  background-color: #C4C4C4; /* A solid, neutral gray */
  box-shadow: none;
}

/* This styles the main "Roll" button in the vs-area */
.vs-area .action-button {
  padding: .5rem .75rem;
  font-size: 1.2rem;
  cursor: pointer; /* <-- THIS IS THE NEW LINE */
}
.result-box {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  border: 2px solid;
  text-align: center;
}
.result-box .outcome-text {
  font-size: 1.5rem;
  line-height: 1;
}
.now-batting { 
  background-color: #fff8e1; 
  font-weight: bold; 
  font-style: normal !important;
  color: #000 !important;
}
.next-up {
  background-color: #e9ecef; /* A neutral light gray */
  color: #000 !important;
}
</style>