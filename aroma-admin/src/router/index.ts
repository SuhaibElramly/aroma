import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '',           redirect: '/dashboard' },
        { path: 'dashboard',  name: 'dashboard',         component: () => import('../views/DashboardView.vue') },
        { path: 'orders',     name: 'orders',            component: () => import('../views/OrdersView.vue') },
        { path: 'orders/:id', name: 'order-detail',      component: () => import('../views/OrderDetailView.vue'), props: true },
        { path: 'products',       name: 'products',        component: () => import('../views/ProductsView.vue') },
        { path: 'products/new',   name: 'product-create',  component: () => import('../views/ProductCreateView.vue') },
        { path: 'products/:id/variants', name: 'product-variants', component: () => import('../views/ProductVariantsView.vue'), props: true },
        { path: 'brands',     name: 'brands',            component: () => import('../views/BrandsView.vue') },
        { path: 'brands/:id', name: 'brand-detail',      component: () => import('../views/BrandDetailView.vue'), props: true },
        { path: 'categories', name: 'categories',        component: () => import('../views/CategoriesView.vue') },
        { path: 'users',      name: 'users',             component: () => import('../views/UsersView.vue') },
        { path: 'users/:id',  name: 'user-detail',       component: () => import('../views/UserDetailView.vue'), props: true },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth  && !auth.isAuthenticated) return { name: 'login' }
  if (to.meta.requiresGuest &&  auth.isAuthenticated) return { name: 'dashboard' }
})
