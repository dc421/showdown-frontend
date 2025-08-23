<script setup>
import { ref } from 'vue';

// Reactive variables to hold the form input
const email = ref('');
const password = ref('');

// The URL of your live backend API on Render
const API_URL = 'https://showdown-backend.onrender.com'; // Replace with your actual Render URL if different

async function handleLogin() {
  try {
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

    const data = await response.json();

    if (!response.ok) {
      // If the server response is not 2xx, throw an error
      throw new Error(data.message || 'Login failed');
    }

    // On successful login, we get a token back
    console.log('Login successful! Token:', data.token);
    alert('Login successful! Check the console for your token.');
    // In the next step, we will store this token and redirect the user.

  } catch (error) {
    console.error('Error during login:', error);
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