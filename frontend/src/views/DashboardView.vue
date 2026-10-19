<template>
  <AppLayout>
    <h1 class="page-title">Dashboard</h1>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- Stats cards -->
    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-label">Total Products</div>
        <div class="stat-value">{{ stats.totalProducts }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Total Stock Units</div>
        <div class="stat-value">{{ stats.totalStock }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Check-Ins (recent)</div>
        <div class="stat-value text-success">{{ stats.checkIns }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Check-Outs (recent)</div>
        <div class="stat-value text-danger">{{ stats.checkOuts }}</div>
      </div>
    </div>

    <!-- Low stock warning -->
    <div v-if="lowStock.length" class="card">
      <h3 class="mb-1">⚠️ Low Stock Alerts</h3>
      <p class="text-muted mb-2">Products with stock below 10 units</p>
      <table class="table">
        <thead>
          <tr><th>Product</th><th>Stock</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in lowStock" :key="p.id">
            <td>{{ p.product_name }}</td>
            <td>{{ p.stock }}</td>
            <td><span class="badge badge-danger">Low</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Recent movements -->
    <div class="card">
      <h3 class="mb-2">Recent Stock Movements</h3>
      <table v-if="recentMovements.length" class="table">
        <thead>
          <tr>
            <th>Time</th><th>Product</th><th>Type</th><th>Qty</th><th>By</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in recentMovements" :key="m.id">
            <td>{{ formatDate(m.created_at) }}</td>
            <td>{{ m.product_name }}</td>
            <td>
              <span :class="m.movement_type === 'check_in' ? 'badge badge-success' : 'badge badge-warning'">
                {{ m.movement_type === 'check_in' ? 'Check-In' : 'Check-Out' }}
              </span>
            </td>
            <td>{{ m.quantity }}</td>
            <td>{{ m.performed_by || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-muted">No stock movements yet.</p>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../api/client.js';
import AppLayout from '../components/AppLayout.vue';

const error = ref('');
const stats = reactive({ totalProducts: 0, totalStock: 0, checkIns: 0, checkOuts: 0 });
const lowStock = ref([]);
const recentMovements = ref([]);

function formatDate(d) {
  return new Date(d).toLocaleString();
}

onMounted(async () => {
  try {
    const [productsRes, historyRes] = await Promise.all([
      api.get('/products?limit=100'),
      api.get('/stock/history?limit=20'),
    ]);

    const products = productsRes.data.data;
    stats.totalProducts = productsRes.data.meta.total;
    stats.totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    lowStock.value = products.filter((p) => p.stock < 10);

    const movements = historyRes.data.data;
    recentMovements.value = movements;
    stats.checkIns = movements.filter((m) => m.movement_type === 'check_in').length;
    stats.checkOuts = movements.filter((m) => m.movement_type === 'check_out').length;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load dashboard data.';
  }
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.stat-card {
  margin-bottom: 0;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  margin-top: 0.25rem;
}

.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
</style>
