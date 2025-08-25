<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { RouterLink } from 'vue-router';

const authStore = useAuthStore();
const email = ref('');
const password = ref('');

async function handleRegister() {
  await authStore.register({ 
    email: email.value, 
    password: password.value 
  });
}
</script>

<template>
  <div id="app-container">
    <div class="form-container">
      <h1>Create Account</h1>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit">Sign Up</button>
      </form>
      <p class="sub-link">
        Already have an account? <RouterLink to="/login">Log In</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
#app-container { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; }
.form-container { padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
h1 { text-align: center; margin-bottom: 1.5rem; }
.form-group { margin-bottom: 1rem; }
label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
input { width: 100%; padding: 0.75rem; border: 1px solid #dddfe2; border-radius: 6px; box-sizing: border-box; }
button { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; background-color: #42b72a; color: white; font-size: 1rem; font-weight: bold; cursor: pointer; }
.sub-link { text-align: center; margin-top: 1rem; }
</style>