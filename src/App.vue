<script setup>
import { ref } from 'vue';

// Reactive variables to hold the form input
const email = ref('');
const password = ref('');

// The URL of your live backend API on Render
const API_URL = 'https://showdown-backend.onrender.com';

async function handleLogin() {
  console.log('1. handleLogin function CALLED.');

  try {
    console.log('2. INSIDE try block. Preparing to fetch...');
    console.log('3. API URL is:', API_URL);
    console.log('4. Sending body:', JSON.stringify({ email: email.value, password: password.value }));

    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    });

    console.log('5. FETCH command completed. Response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    console.log('6. SUCCESS! Token:', data.token);
    alert('Login successful! Check the console for your token.');

  } catch (error) {
    console.error('7. ERROR caught in catch block:', error);
    alert(`Login failed: ${error.message}`);
  }
}
</script>

<template>
  <div id="app-container">
    <div class="login-form">
      <h1>MLB Showdown</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
#app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.login-form {
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #1c1e21;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #4b4f56;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #dddfe2;
  border-radius: 6px;
  box-sizing: border-box; /* Important for padding to not affect width */
}

button {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  background-color: #1877f2;
  color: white;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #166fe5;
}
</style>