import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { PermAction } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    requiredResource?: string
    requiredAction?: PermAction
  }
}

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
        { path: 'dashboard',  name: 'dashboard',      component: () => import('../views/DashboardView.vue') },
        { path: 'orders',     name: 'orders',         component: () => import('../views/OrdersView.vue'),          meta: { requiredResource: 'orders' } },
        { path: 'orders/:id', name: 'order-detail',   component: () => import('../views/OrderDetailView.vue'),     props: true, meta: { requiredResource: 'orders' } },
        { path: 'products',          name: 'products',       component: () => import('../views/ProductsView.vue'),          meta: { requiredResource: 'products' } },
        { path: 'products/new',      name: 'product-create', component: () => import('../views/ProductStepperView.vue'),    meta: { requiredResource: 'products', requiredAction: 'edit' } },
        { path: 'products/:id/edit', name: 'product-edit',   component: () => import('../views/ProductStepperView.vue'),    meta: { requiredResource: 'products', requiredAction: 'edit' } },
        { path: 'products/:id/variants', redirect: (to) => ({ name: 'product-edit', params: { id: to.params.id } }) },
        { path: 'products/:id', name: 'product-detail', component: () => import('../views/ProductDetailView.vue'), props: true, meta: { requiredResource: 'products' } },
        { path: 'brands',     name: 'brands',        component: () => import('../views/BrandsView.vue'),           meta: { requiredResource: 'brands' } },
        { path: 'brands/:id', name: 'brand-detail',  component: () => import('../views/BrandDetailView.vue'),      props: true, meta: { requiredResource: 'brands' } },
        { path: 'categories', name: 'categories',    component: () => import('../views/CategoriesView.vue'),       meta: { requiredResource: 'brands' } },
        { path: 'users',      name: 'users',         component: () => import('../views/UsersView.vue'),            meta: { requiredResource: 'customers' } },
        { path: 'users/:id',  name: 'user-detail',   component: () => import('../views/UserDetailView.vue'),       props: true, meta: { requiredResource: 'customers' } },
        { path: 'coupons',    name: 'coupons',       component: () => import('../views/CouponsView.vue'),          meta: { requiredResource: 'coupons' } },
        { path: 'spec-types', name: 'spec-types',    component: () => import('../views/SpecTypesView.vue'),        meta: { requiredResource: 'specs' } },
        { path: 'admins',     name: 'admins',        component: () => import('../views/AdminsView.vue'),           meta: { requiredResource: 'admins' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresGuest && auth.isAuthenticated) return { name: 'dashboard' }
  if (to.meta.requiresAuth  && !auth.isAuthenticated) return { name: 'login' }

  // Ensure user object is loaded before permission check
  if (auth.isAuthenticated && !auth.user) {
    await auth.init()
  }

  if (to.meta.requiredResource) {
    const action = to.meta.requiredAction ?? 'view'
    if (!auth.can(to.meta.requiredResource, action)) {
      return { name: 'dashboard' }
    }
  }
})
