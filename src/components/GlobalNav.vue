<script setup>
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
</script>

<template>
  <nav class="global-nav">
    <RouterLink to="/dashboard">Dashboard</RouterLink>
    <button @click="authStore.logout()">Logout</button>
  </nav>
</template>

<style scoped>
.global-nav {
  background-color: #343a40;
  padding: 0.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.global-nav a {
  color: white;
  text-decoration: none;
  font-weight: bold;
}
.global-nav a:hover {
  opacity: 0.8;
}
.global-nav button {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
</style>