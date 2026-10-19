<template>
  <div class="login-page">
    <div class="login-card">
      <h1>📦 Inventory Management</h1>
      <p class="text-muted mb-2">Sign in to your account</p>

      <div v-if="error" class="alert alert-danger">{{ error }}</div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Username</label>
          <input
            v-model="username"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.username }"
            placeholder="Enter username"
            required
            autocomplete="username"
          />
          <div v-if="errors.username" class="text-danger" style="font-size:0.8rem">{{ errors.username }}</div>
        </div>

        <div class="form-group">
          <label>Password</label>
          <input
            v-model="password"
            type="password"
            class="form-control"
            :class="{ 'is-invalid': errors.password }"
            placeholder="Enter password"
            required
            autocomplete="current-password"
          />
          <div v-if="errors.password" class="text-danger" style="font-size:0.8rem">{{ errors.password }}</div>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const errors = reactive({ username: '', password: '' });

async function handleLogin() {
  errors.username = '';
  errors.password = '';
  error.value = '';

  // Client-side validation
  let valid = true;
  if (!username.value || username.value.length < 3) {
    errors.username = 'Username must be at least 3 characters';
    valid = false;
  }
  if (!password.value) {
    errors.password = 'Password is required';
    valid = false;
  }
  if (!valid) return;

  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push({ name: 'dashboard' });
  } catch (err) {
    error.value = err.response?.data?.message || 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
}

.login-card {
  background: #fff;
  border-radius: 12px;
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-card h1 {
  font-size: 1.4rem;
  margin-bottom: 0.25rem;
  text-align: center;
}

.login-card p {
  text-align: center;
}

.text-danger {
  color: #dc2626;
}
</style>
