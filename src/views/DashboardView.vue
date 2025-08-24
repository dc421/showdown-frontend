<script setup>
import { onMounted, onUnmounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { RouterLink } from 'vue-router';
import { socket } from '@/services/socket';

const authStore = useAuthStore();

const gamesToJoin = computed(() => {
    if (!authStore.user) return [];
    return authStore.openGames.filter(game => game.host_username !== authStore.user.username)
});

function handleCreateGame() {
  if (authStore.rosters.length > 0) {
    authStore.createGame(authStore.rosters[0].roster_id);
  } else {
    alert('You must create a roster before you can create a game.');
  }
}

function handleJoinGame(gameId) {
    if (authStore.rosters.length > 0) {
    authStore.joinGame(gameId, authStore.rosters[0].roster_id);
  } else {
    alert('You must create a roster before you can join a game.');
  }
}

function refreshData() {
    console.log('Received games-updated event, refreshing lists...');
    authStore.fetchMyGames();
    authStore.fetchOpenGames();
}

onMounted(() => {
  authStore.fetchRosters();
  authStore.fetchMyGames();
  authStore.fetchOpenGames();
  socket.connect();
  socket.on('games-updated', refreshData);
});

onUnmounted(() => {
  socket.off('games-updated', refreshData);
});
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Welcome, {{ authStore.user?.username }}!</h1>
      <button @click="authStore.logout()">Logout</button>
    </header>

    <main>
      <div class="panel">
        <div class="panel-header">
          <h2>Your Active Games</h2>
          <button @click="handleCreateGame" class="action-btn"> + Create New Game</button>
        </div>
        <ul v-if="authStore.myGames.length > 0">
          <li v-for="game in authStore.myGames" :key="game.game_id">
            <RouterLink :to="game.status === 'pending' ? `/game/${game.game_id}/setup` : `/game/${game.game_id}`">
              <span>Game #{{ game.game_id }}</span>
              <span class="status">{{ game.status }}</span>
              <span v-if="game.status === 'in_progress' && game.current_turn_user_id === authStore.user?.userId" class="turn-indicator">
                Your Turn!
              </span>
            </RouterLink>
          </li>
        </ul>
        <p v-else>You are not in any games.</p>
      </div>

      <div class="panel">
        <h2>Open Games to Join</h2>
         <ul v-if="gamesToJoin.length > 0">
          <li v-for="game in gamesToJoin" :key="game.game_id">
            <span>Game hosted by {{ game.host_username }}</span>
            <button @click="handleJoinGame(game.game_id)">Join Game</button>
          </li>
        </ul>
        <p v-else>No open games to join.</p>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2>Your Rosters</h2>
          <RouterLink to="/roster-builder">
            <button class="action-btn">+ Create New Roster</button>
          </RouterLink>
        </div>
        <ul v-if="authStore.rosters.length > 0">
          <li v-for="roster in authStore.rosters" :key="roster.roster_id">
            {{ roster.roster_name }}
          </li>
        </ul>
        <p v-else>You haven't created any rosters yet.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
  .dashboard { max-width: 800px; margin: 2rem auto; padding: 2rem; font-family: sans-serif; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
  main { margin-top: 2rem; display: grid; gap: 2rem; }
  .panel { background: #f9f9f9; padding: 1.5rem; border-radius: 8px; }
  .panel-header { /* <-- CHANGE #2: New style for the header */
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .panel-header h2 { margin: 0; }
  .action-btn { /* <-- CHANGE #3: Removed float */
    /* No float needed anymore */
  }
  ul { list-style: none; padding: 0; }
  li { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: #fff; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 0.5rem; }
  li a { display: flex; flex-grow: 1; justify-content: space-between; text-decoration: none; color: inherit; }
  li a:hover { background-color: #f0f0f0; }
  .status { text-transform: capitalize; color: #555; }
  .turn-indicator { font-weight: bold; color: green; }
</style>