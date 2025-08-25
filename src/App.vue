<script setup>
import { RouterView } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'; // <-- Import
import { useAuthStore } from './stores/auth';
const authStore = useAuthStore();
</script>

<template>
  <GlobalNav v-if="authStore.isAuthenticated" /> 
  <RouterView />
</template>

<style>
  /* You can add global styles here if you wish */
</style>