import { createRouter, createWebHistory } from 'vue-router'

// Page components
import HomePage from '../components/HomePage.vue'
import MenusPage from '../components/MenusPage.vue'
import MenuPage from '../components/MenuPage.vue'
import StoreCatalogPage from '../components/StoreCatalogPage.vue'
import WeeklyCartPage from '../components/WeeklyCartPage.vue'

const routes = [
  { path: '/', name: 'home', component: HomePage },
  { path: '/menus', name: 'menus', component: MenusPage },
  { path: '/menu/:id', name: 'menu', component: MenuPage, props: (route) => ({ menuId: route.params.id }) },
  { path: '/store-catalog', name: 'store-catalog', component: StoreCatalogPage },
  { path: '/weekly-cart', name: 'weekly-cart', component: WeeklyCartPage }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router


