<template>
  <AppLayout>
    <h1 class="page-title">My Profile</h1>

    <div v-if="message" class="alert alert-success">{{ message }}</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div class="card" style="max-width:640px">
      <h3 class="mb-2">Account Information</h3>

      <div v-if="profile" class="profile-grid">
        <div class="form-group">
          <label>Username</label>
          <div class="profile-value">{{ profile.username }}</div>
        </div>
        <div class="form-group">
          <label>Role</label>
          <div class="profile-value">
            <span :class="profile.role === 'admin' ? 'badge badge-info' : 'badge badge-warning'">
              {{ profile.role }}
            </span>
          </div>
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <div class="profile-value">{{ profile.first_name }} {{ profile.last_name }}</div>
        </div>
        <div class="form-group">
          <label>Email</label>
          <div class="profile-value">{{ profile.email }}</div>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <div class="profile-value">{{ profile.phone_number }}</div>
        </div>
        <div class="form-group">
          <label>Birth Date</label>
          <div class="profile-value">{{ formatDate(profile.birth_date) }}</div>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Home Address</label>
          <div class="profile-value">{{ profile.home_address }}</div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <div class="profile-value">
            <span :class="profile.status === 'active' ? 'badge badge-success' : 'badge badge-danger'">
              {{ profile.status }}
            </span>
          </div>
        </div>
        <div class="form-group">
          <label>Member Since</label>
          <div class="profile-value">{{ formatDate(profile.created_at) }}</div>
        </div>
      </div>

      <button class="btn btn-danger mt-2" @click="handleLogout">Logout</button>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import AppLayout from '../components/AppLayout.vue';

const router = useRouter();
const auth = useAuthStore();

const profile = ref(null);
const message = ref('');
const error = ref('');

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function handleLogout() {
  auth.logout();
  router.push({ name: 'login' });
}

onMounted(async () => {
  try {
    await auth.fetchProfile();
    profile.value = auth.user;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load profile.';
  }
});
</script>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1.5rem;
}

.profile-value {
  padding: 0.45rem 0;
  font-weight: 600;
}
</style>
