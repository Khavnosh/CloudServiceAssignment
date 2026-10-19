<template>
  <AppLayout>
    <h1 class="page-title">Stock Control</h1>

    <div v-if="message" class="alert alert-success">{{ message }}</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- Search product -->
    <div class="card">
      <h3 class="mb-2">Search Product</h3>
      <div class="flex gap-1">
        <input
          v-model="search"
          class="form-control"
          placeholder="Search by product name or ID..."
          @input="debouncedFetch"
        />
      </div>

      <table v-if="products.length" class="table mt-2">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Expirable</th>
            <th>Expiry</th>
            <th>Last Stocked</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ p.product_name }}</td>
            <td>Rp {{ formatPrice(p.price) }}</td>
            <td>
              <span :class="p.stock < 10 ? 'badge badge-danger' : 'badge badge-success'">
                {{ p.stock }}
              </span>
            </td>
            <td>{{ p.is_expirable ? 'Yes' : 'No' }}</td>
            <td>{{ p.expirable_date ? new Date(p.expirable_date).toLocaleDateString() : '—' }}</td>
            <td>{{ new Date(p.last_stocked).toLocaleString() }}</td>
            <td>
              <button class="btn btn-success" style="padding:0.3rem 0.7rem" @click="openCheckIn(p)">
                Check-In
              </button>
              <button class="btn btn-danger" style="padding:0.3rem 0.7rem" @click="openCheckOut(p)">
                Check-Out
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Movement history -->
    <div class="card">
      <h3 class="mb-2">Stock Movement History</h3>
      <table v-if="history.length" class="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Product</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Notes</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in history" :key="m.id">
            <td>{{ new Date(m.created_at).toLocaleString() }}</td>
            <td>{{ m.product_name }}</td>
            <td>
              <span :class="m.movement_type === 'check_in' ? 'badge badge-success' : 'badge badge-warning'">
                {{ m.movement_type === 'check_in' ? 'Check-In' : 'Check-Out' }}
              </span>
            </td>
            <td>{{ m.quantity }}</td>
            <td>{{ m.notes || '—' }}</td>
            <td>{{ m.performed_by || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-muted">No movements recorded yet.</p>
    </div>

    <!-- Check-In Modal -->
    <div v-if="checkInTarget" class="modal-backdrop" @click.self="checkInTarget = null">
      <div class="modal">
        <h3>Check-In: {{ checkInTarget.product_name }}</h3>
        <p class="text-muted mb-2">Current stock: {{ checkInTarget.stock }}</p>

        <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>

        <form @submit.prevent="doCheckIn">
          <div class="form-group">
            <label>Quantity to Check-In *</label>
            <input v-model.number="checkInForm.quantity" type="number" min="1" class="form-control" required />
          </div>

          <div v-if="checkInTarget.is_expirable" class="form-group">
            <label>New Expiry Date</label>
            <input v-model="checkInForm.expirable_date" type="date" class="form-control" :min="todayStr" />
            <small class="text-muted">Must be today or later.</small>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <input v-model="checkInForm.notes" class="form-control" maxlength="500" />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="checkInTarget = null">Cancel</button>
            <button type="submit" class="btn btn-success" :disabled="saving">
              {{ saving ? 'Processing...' : 'Check-In' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Check-Out Modal -->
    <div v-if="checkOutTarget" class="modal-backdrop" @click.self="checkOutTarget = null">
      <div class="modal">
        <h3>Check-Out: {{ checkOutTarget.product_name }}</h3>
        <p class="text-muted mb-2">
          Available stock: <strong>{{ checkOutTarget.stock }}</strong>
        </p>

        <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>

        <form @submit.prevent="doCheckOut">
          <div class="form-group">
            <label>Quantity to Check-Out *</label>
            <input
              v-model.number="checkOutForm.quantity"
              type="number"
              min="1"
              :max="checkOutTarget.stock"
              class="form-control"
              required
            />
          </div>

          <div class="form-group">
            <label>Notes</label>
            <input v-model="checkOutForm.notes" class="form-control" maxlength="500" />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="checkOutTarget = null">Cancel</button>
            <button type="submit" class="btn btn-danger" :disabled="saving">
              {{ saving ? 'Processing...' : 'Check-Out' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../api/client.js';
import AppLayout from '../components/AppLayout.vue';

const products = ref([]);
const history = ref([]);
const search = ref('');

const message = ref('');
const error = ref('');
const modalError = ref('');
const saving = ref(false);

const checkInTarget = ref(null);
const checkOutTarget = ref(null);

const checkInForm = reactive({ quantity: 1, expirable_date: '', notes: '' });
const checkOutForm = reactive({ quantity: 1, notes: '' });

const todayStr = new Date().toISOString().slice(0, 10);

function formatPrice(v) {
  return Number(v).toLocaleString('id-ID', { minimumFractionDigits: 2 });
}

let debounceTimer;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchProducts, 400);
}

async function fetchProducts() {
  try {
    const res = await api.get('/products', { params: { q: search.value, limit: 20 } });
    products.value = res.data.data;
    error.value = '';
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load products.';
  }
}

async function fetchHistory() {
  try {
    const res = await api.get('/stock/history', { params: { limit: 30 } });
    history.value = res.data.data;
  } catch {
    // silent
  }
}

function openCheckIn(p) {
  checkInTarget.value = p;
  modalError.value = '';
  Object.assign(checkInForm, { quantity: 1, expirable_date: '', notes: '' });
}

function openCheckOut(p) {
  checkOutTarget.value = p;
  modalError.value = '';
  Object.assign(checkOutForm, { quantity: 1, notes: '' });
}

async function doCheckIn() {
  if (!Number.isInteger(checkInForm.quantity) || checkInForm.quantity < 1) {
    modalError.value = 'Quantity must be a positive integer.';
    return;
  }
  if (checkInForm.expirable_date && checkInForm.expirable_date < todayStr) {
    modalError.value = 'Expiry date must be today or a future date.';
    return;
  }

  saving.value = true;
  modalError.value = '';

  try {
    const payload = {
      product_id: checkInTarget.value.id,
      quantity: checkInForm.quantity,
      notes: checkInForm.notes || null,
    };
    if (checkInForm.expirable_date) {
      payload.expirable_date = checkInForm.expirable_date;
    }

    const res = await api.post('/stock/check-in', payload);
    message.value = res.data.message;
    checkInTarget.value = null;
    await Promise.all([fetchProducts(), fetchHistory()]);
  } catch (err) {
    modalError.value = err.response?.data?.message || 'Check-in failed.';
  } finally {
    saving.value = false;
    setTimeout(() => (message.value = ''), 5000);
  }
}

async function doCheckOut() {
  if (!Number.isInteger(checkOutForm.quantity) || checkOutForm.quantity < 1) {
    modalError.value = 'Quantity must be a positive integer.';
    return;
  }
  if (checkOutForm.quantity > checkOutTarget.value.stock) {
    modalError.value = `Stock insufficient. Available: ${checkOutTarget.value.stock}.`;
    return;
  }

  saving.value = true;
  modalError.value = '';

  try {
    const res = await api.post('/stock/check-out', {
      product_id: checkOutTarget.value.id,
      quantity: checkOutForm.quantity,
      notes: checkOutForm.notes || null,
    });
    message.value = res.data.message;
    checkOutTarget.value = null;
    await Promise.all([fetchProducts(), fetchHistory()]);
  } catch (err) {
    // Display backend's stock-insufficient warning prominently
    modalError.value = err.response?.data?.message || 'Check-out failed.';
  } finally {
    saving.value = false;
    setTimeout(() => (message.value = ''), 5000);
  }
}

onMounted(() => {
  fetchProducts();
  fetchHistory();
});
</script>
