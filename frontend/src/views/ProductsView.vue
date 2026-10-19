<template>
  <AppLayout>
    <div class="flex-between mb-2">
      <h1 class="page-title" style="margin:0">Products</h1>
      <button v-if="auth.isAdmin" class="btn btn-primary" @click="openCreate">
        + Add Product
      </button>
    </div>

    <!-- Search -->
    <div class="card">
      <div class="flex gap-1">
        <input
          v-model="search"
          class="form-control"
          placeholder="Search by product name or ID..."
          @input="debouncedFetch"
        />
        <button class="btn btn-secondary" @click="fetchProducts">Search</button>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="message" class="alert alert-success">{{ message }}</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- Table -->
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Expirable</th>
            <th>Expiry Date</th>
            <th>Last Stocked</th>
            <th v-if="auth.isAdmin">Actions</th>
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
            <td>
              <span :class="p.is_expirable ? 'badge badge-warning' : 'badge badge-info'">
                {{ p.is_expirable ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>{{ p.expirable_date ? formatDate(p.expirable_date) : '—' }}</td>
            <td>{{ formatDate(p.last_stocked) }}</td>
            <td v-if="auth.isAdmin">
              <button class="btn btn-secondary" style="padding:0.3rem 0.7rem" @click="openEdit(p)">
                Edit
              </button>
              <button class="btn btn-danger" style="padding:0.3rem 0.7rem" @click="confirmDelete(p)">
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="!products.length">
            <td :colspan="auth.isAdmin ? 8 : 7" class="text-muted text-right">No products found.</td>
          </tr>
        </tbody>
      </table>

      <div class="flex-between mt-2">
        <span class="text-muted">Showing {{ products.length }} of {{ total }} products</span>
        <div class="flex gap-1">
          <button class="btn btn-secondary" :disabled="page <= 1" @click="page--; fetchProducts()">
            Previous
          </button>
          <button class="btn btn-secondary" :disabled="page * limit >= total" @click="page++; fetchProducts()">
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ editingId ? 'Edit Product' : 'Add Product' }}</h3>

        <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>

        <form @submit.prevent="saveProduct">
          <div class="form-group">
            <label>Product Name *</label>
            <input v-model="form.product_name" class="form-control" required maxlength="200" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Price (Rp) *</label>
              <input v-model.number="form.price" type="number" min="0" step="0.01" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Stock *</label>
              <input v-model.number="form.stock" type="number" min="0" class="form-control" required />
            </div>
          </div>

          <div class="form-group">
            <label>
              <input v-model="form.is_expirable" type="checkbox" />
              Product is expirable
            </label>
          </div>

          <div v-if="form.is_expirable" class="form-group">
            <label>Expiry Date *</label>
            <input
              v-model="form.expirable_date"
              type="date"
              class="form-control"
              :required="form.is_expirable"
              :min="todayStr"
            />
            <small class="text-muted">Must be today or later.</small>
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
        <h3>Confirm Delete</h3>
        <p>Are you sure you want to delete <strong>{{ deleteTarget.product_name }}</strong>?</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-danger" @click="deleteProduct">Delete</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import AppLayout from '../components/AppLayout.vue';

const auth = useAuthStore();

const products = ref([]);
const total = ref(0);
const search = ref('');
const page = ref(1);
const limit = 15;

const message = ref('');
const error = ref('');
const modalError = ref('');

const showModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const deleteTarget = ref(null);

const form = reactive({
  product_name: '',
  price: 0,
  stock: 0,
  is_expirable: false,
  expirable_date: '',
});

const todayStr = new Date().toISOString().slice(0, 10);

function formatPrice(v) {
  return Number(v).toLocaleString('id-ID', { minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

let debounceTimer;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchProducts();
  }, 400);
}

async function fetchProducts() {
  try {
    const res = await api.get('/products', {
      params: { q: search.value, page: page.value, limit },
    });
    products.value = res.data.data;
    total.value = res.data.meta.total;
    error.value = '';
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load products.';
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, {
    product_name: '', price: 0, stock: 0,
    is_expirable: false, expirable_date: '',
  });
  modalError.value = '';
  showModal.value = true;
}

function openEdit(p) {
  editingId.value = p.id;
  Object.assign(form, {
    product_name: p.product_name,
    price: Number(p.price),
    stock: p.stock,
    is_expirable: p.is_expirable,
    expirable_date: p.expirable_date ? p.expirable_date.slice(0, 10) : '',
  });
  modalError.value = '';
  showModal.value = true;
}

async function saveProduct() {
  // Client-side validation
  if (!form.product_name.trim()) {
    modalError.value = 'Product name is required.';
    return;
  }
  if (form.price < 0) {
    modalError.value = 'Price cannot be negative.';
    return;
  }
  if (form.stock < 0) {
    modalError.value = 'Stock cannot be negative.';
    return;
  }
  if (form.is_expirable && !form.expirable_date) {
    modalError.value = 'Expiry date is required for expirable products.';
    return;
  }
  if (form.is_expirable && form.expirable_date < todayStr) {
    modalError.value = 'Expiry date must be today or a future date.';
    return;
  }
  if (form.product_name.length > 200) {
    modalError.value = 'Product name must be at most 200 characters.';
    return;
  }

  saving.value = true;
  modalError.value = '';

  const payload = {
    product_name: form.product_name.trim(),
    price: form.price,
    stock: form.stock,
    is_expirable: form.is_expirable,
    expirable_date: form.is_expirable ? form.expirable_date : null,
  };

  try {
    if (editingId.value) {
      await api.put(`/products/${editingId.value}`, payload);
      message.value = 'Product updated successfully.';
    } else {
      await api.post('/products', payload);
      message.value = 'Product created successfully.';
    }
    showModal.value = false;
    fetchProducts();
  } catch (err) {
    modalError.value = err.response?.data?.message || 'Failed to save product.';
    if (err.response?.data?.errors) {
      modalError.value += ' ' + err.response.data.errors.map((e) => e.message).join('; ');
    }
  } finally {
    saving.value = false;
    setTimeout(() => (message.value = ''), 4000);
  }
}

function confirmDelete(p) {
  deleteTarget.value = p;
}

async function deleteProduct() {
  try {
    await api.delete(`/products/${deleteTarget.value.id}`);
    message.value = 'Product deleted successfully.';
    deleteTarget.value = null;
    fetchProducts();
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to delete product.';
    deleteTarget.value = null;
  }
  setTimeout(() => (message.value = ''), 4000);
}

onMounted(fetchProducts);
</script>
