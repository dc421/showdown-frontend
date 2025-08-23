// src/views/DashboardView.vue
<script setup>
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
</script>

<template>
  <div>
    <h1>Welcome, {{ authStore.user?.username }}!</h1>
    <p>This is your dashboard. You can see this page because you are logged in.</p>
    <button @click="authStore.logout()">Logout</button>
  </div>
</template>