<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { RouterLink } from 'vue-router';

const authStore = useAuthStore();

// onMounted is a lifecycle hook that runs when the component is first loaded
onMounted(() => {
  authStore.fetchRosters();
});
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Welcome, {{ authStore.user?.username }}!</h1>
      <button @click="authStore.logout()">Logout</button>
    </header>

    <main>
      <h2>Your Rosters</h2>
      <ul v-if="authStore.rosters.length > 0">
        <li v-for="roster in authStore.rosters" :key="roster.roster_id">
          {{ roster.roster_name }}
        </li>
      </ul>
      <p v-else>You haven't created any rosters yet.</p>
      
      <RouterLink to="/roster-builder">
        <button class="create-roster-btn">+ Create New Roster</button>
      </RouterLink>
    </main>
  </div>
</template>

<style scoped>
  .dashboard {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: sans-serif;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding-bottom: 1rem;
  }
  h2 {
    margin-top: 2rem;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    padding: 0.75rem;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .create-roster-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 1rem;
  }
</style>