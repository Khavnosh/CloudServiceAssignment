<template>
  <AppLayout>
    <div class="flex-between mb-2">
      <h1 class="page-title" style="margin:0">Employees</h1>
      <button class="btn btn-primary" @click="openCreate">+ Add Employee</button>
    </div>

    <!-- Search -->
    <div class="card">
      <input
        v-model="search"
        class="form-control"
        placeholder="Search employees by name, username, or email..."
        @input="debouncedFetch"
      />
    </div>

    <div v-if="message" class="alert alert-success">{{ message }}</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- Table -->
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in employees" :key="e.id">
            <td>{{ e.id }}</td>
            <td>{{ e.first_name }} {{ e.last_name }}</td>
            <td>{{ e.username }}</td>
            <td>{{ e.email }}</td>
            <td>{{ e.phone_number }}</td>
            <td>
              <span :class="e.role === 'admin' ? 'badge badge-info' : 'badge badge-warning'">
                {{ e.role }}
              </span>
            </td>
            <td>
              <span :class="e.status === 'active' ? 'badge badge-success' : 'badge badge-danger'">
                {{ e.status }}
              </span>
            </td>
            <td>
              <button class="btn btn-secondary" style="padding:0.3rem 0.7rem" @click="openEdit(e)">Edit</button>
              <button class="btn btn-danger" style="padding:0.3rem 0.7rem" @click="confirmDelete(e)">Remove</button>
            </td>
          </tr>
          <tr v-if="!employees.length">
            <td colspan="8" class="text-muted text-right">No employees found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ editingId ? 'Edit Employee' : 'Add Employee' }}</h3>

        <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>

        <form @submit.prevent="saveEmployee">
          <div class="form-row">
            <div class="form-group">
              <label>First Name *</label>
              <input v-model="form.first_name" class="form-control" required maxlength="100" />
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input v-model="form.last_name" class="form-control" required maxlength="100" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Birth Date *</label>
              <input v-model="form.birth_date" type="date" class="form-control" required :max="maxBirthDate" />
            </div>
            <div class="form-group">
              <label>Phone Number *</label>
              <input
                v-model="form.phone_number"
                class="form-control"
                required
                maxlength="30"
                pattern="[0-9+\-() ]+"
                title="Digits, spaces, +, -, parentheses only"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Home Address *</label>
            <input v-model="form.home_address" class="form-control" required maxlength="500" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Email *</label>
              <input v-model="form.email" type="email" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Username *</label>
              <input
                v-model="form.username"
                class="form-control"
                required
                minlength="3"
                maxlength="50"
                pattern="[a-zA-Z0-9._\-]+"
                title="Letters, numbers, dots, underscores, and hyphens only"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Password {{ editingId ? '(leave blank to keep)' : '*' }}</label>
              <input
                v-model="form.password"
                type="password"
                class="form-control"
                :required="!editingId"
                minlength="8"
              />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="form.status" class="form-control">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Role</label>
            <select v-model="form.role" class="form-control">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete confirmation -->
    <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
      <div class="modal">
        <h3>Confirm Remove</h3>
        <p>
          Are you sure you want to remove
          <strong>{{ deleteTarget.first_name }} {{ deleteTarget.last_name }}</strong>?
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-danger" @click="deleteEmployee">Remove</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../api/client.js';
import AppLayout from '../components/AppLayout.vue';

const employees = ref([]);
const search = ref('');

const message = ref('');
const error = ref('');
const modalError = ref('');

const showModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const deleteTarget = ref(null);

const form = reactive({
  first_name: '',
  last_name: '',
  birth_date: '',
  home_address: '',
  phone_number: '',
  email: '',
  username: '',
  password: '',
  status: 'active',
  role: 'employee',
});

// Birth date must be at least 15 years ago
const maxBirthDate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 15);
  return d.toISOString().slice(0, 10);
})();

let debounceTimer;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchEmployees, 400);
}

async function fetchEmployees() {
  try {
    const res = await api.get('/employees', { params: { q: search.value } });
    employees.value = res.data.data;
    error.value = '';
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load employees.';
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, {
    first_name: '', last_name: '', birth_date: '', home_address: '',
    phone_number: '', email: '', username: '', password: '',
    status: 'active', role: 'employee',
  });
  modalError.value = '';
  showModal.value = true;
}

function openEdit(e) {
  editingId.value = e.id;
  Object.assign(form, {
    first_name: e.first_name,
    last_name: e.last_name,
    birth_date: e.birth_date ? e.birth_date.slice(0, 10) : '',
    home_address: e.home_address,
    phone_number: e.phone_number,
    email: e.email,
    username: e.username,
    password: '',
    status: e.status,
    role: e.role,
  });
  modalError.value = '';
  showModal.value = true;
}

async function saveEmployee() {
  // Client-side validation matching the flow diagram's "Is Data Valid?"
  if (!form.first_name.trim() || !form.last_name.trim()) {
    modalError.value = 'First and last name are required.';
    return;
  }
  if (!form.birth_date) {
    modalError.value = 'Birth date is required.';
    return;
  }
  if (form.birth_date > maxBirthDate) {
    modalError.value = 'Employee must be at least 15 years old.';
    return;
  }
  if (!form.home_address.trim()) {
    modalError.value = 'Home address is required.';
    return;
  }
  if (!form.phone_number.trim() || !/^[0-9+\-() ]{5,30}$/.test(form.phone_number.trim())) {
    modalError.value = 'Phone number may only contain digits, spaces, +, -, and parentheses.';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    modalError.value = 'Valid email is required.';
    return;
  }
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(form.username.trim())) {
    modalError.value = 'Username must be 3–50 characters (letters, numbers, . _ - only).';
    return;
  }
  if (!editingId.value && (!form.password || form.password.length < 8)) {
    modalError.value = 'Password must be at least 8 characters.';
    return;
  }
  if (form.password && !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(form.password)) {
    modalError.value = 'Password must contain at least one letter and one number.';
    return;
  }

  saving.value = true;
  modalError.value = '';

  const payload = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    birth_date: form.birth_date,
    home_address: form.home_address.trim(),
    phone_number: form.phone_number.trim(),
    email: form.email.trim(),
    username: form.username.trim(),
    status: form.status,
    role: form.role,
  };
  if (form.password) payload.password = form.password;

  try {
    if (editingId.value) {
      await api.put(`/employees/${editingId.value}`, payload);
      message.value = 'Employee updated successfully.';
    } else {
      await api.post('/employees', payload);
      message.value = 'Employee created successfully.';
    }
    showModal.value = false;
    fetchEmployees();
  } catch (err) {
    modalError.value = err.response?.data?.message || 'Failed to save employee.';
    if (err.response?.data?.errors) {
      modalError.value += ' ' + err.response.data.errors.map((e) => e.message).join('; ');
    }
  } finally {
    saving.value = false;
    setTimeout(() => (message.value = ''), 4000);
  }
}

function confirmDelete(e) {
  deleteTarget.value = e;
}

async function deleteEmployee() {
  try {
    await api.delete(`/employees/${deleteTarget.value.id}`);
    message.value = 'Employee removed successfully.';
    deleteTarget.value = null;
    fetchEmployees();
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to remove employee.';
    deleteTarget.value = null;
  }
  setTimeout(() => (message.value = ''), 4000);
}

onMounted(fetchEmployees);
</script>
