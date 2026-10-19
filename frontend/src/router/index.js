import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import ProductsView from '../views/ProductsView.vue';
import StockView from '../views/StockView.vue';
import EmployeesView from '../views/EmployeesView.vue';
import ProfileView from '../views/ProfileView.vue';

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/products', name: 'products', component: ProductsView },
  { path: '/stock', name: 'stock', component: StockView },
  { path: '/employees', name: 'employees', component: EmployeesView, meta: { admin: true } },
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();

  // Redirect logged-in users away from login page
  if (to.name === 'login' && auth.isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  // Require auth for non-public pages
  if (!to.meta.public && !auth.isAuthenticated) {
    return next({ name: 'login' });
  }

  // Admin-only pages
  if (to.meta.admin && !auth.isAdmin) {
    return next({ name: 'dashboard' });
  }

  return next();
});

export default router;
