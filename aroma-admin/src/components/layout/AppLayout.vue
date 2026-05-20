<template>
  <div class="flex h-screen overflow-hidden bg-dash-bg">
    <Sidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      <main class="flex-1 overflow-y-auto p-6">
        <div class="animate-fade-up">
          <RouterView />
        </div>
      </main>
    </div>
    <NewProductDrawer />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Sidebar          from './Sidebar.vue'
import Topbar           from './Topbar.vue'
import NewProductDrawer from '../product/NewProductDrawer.vue'
</script>
