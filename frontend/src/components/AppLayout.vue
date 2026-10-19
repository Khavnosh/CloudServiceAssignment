<template>
  <div class="app-shell">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="brand">📦 Inventory</div>
      <nav>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/products">Products</router-link>
        <router-link to="/stock">Stock Control</router-link>
        <router-link v-if="auth.isAdmin" to="/employees">Employees</router-link>
        <router-link to="/profile">Profile</router-link>
      </nav>
      <div class="user-box">
        <div><strong>{{ auth.user?.first_name }} {{ auth.user?.last_name }}</strong></div>
        <div class="text-muted">{{ auth.user?.role }}</div>
        <button class="btn btn-danger mt-1" style="width:100%" @click="handleLogout">
          Logout
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>
