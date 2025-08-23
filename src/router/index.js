// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      // Redirect root to dashboard if logged in, otherwise to login
      path: '/',
      redirect: () => {
        const auth = useAuthStore();
        return auth.isAuthenticated ? '/dashboard' : '/login';
      }
    }
  ]
})

// Navigation Guard
router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // If a route requires auth and the user isn't logged in, redirect to login
    next('/login');
  } else {
    // Otherwise, allow navigation
    next();
  }
});

export default router