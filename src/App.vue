<template>
  <div id="app">
    <!-- Login Page -->
    <LoginPage 
      v-if="!isLoggedIn" 
      @login-success="handleLoginSuccess" 
    />
    
    <!-- Main Application -->
    <div v-else class="app-container">
      <header class="header">
        <div class="header-content">
          <div class="header-left">
            <router-link to="/" class="logo-btn">
              <h1>Menu Manager</h1>
            </router-link>
          </div>
          <div class="header-center">
            <nav class="navigation">
              <router-link to="/store-catalog" class="nav-btn" :class="{ 'active': $route.name === 'store-catalog' }">Store Catalog</router-link>
              <router-link to="/menus" class="nav-btn" :class="{ 'active': $route.name === 'menus' }">Menus</router-link>
              <router-link to="/weekly-cart" class="nav-btn" :class="{ 'active': $route.name === 'weekly-cart' }">Weekly Cart</router-link>
            </nav>
          </div>
          <div class="header-right">
            <div class="user-info">
              <span class="username">Bonjour {{ currentUser.username }} !</span>
              <button @click="handleLogout" class="logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </header>
      
      <main class="main">
        <router-view v-slot="{ Component }">
          <component :is="Component" @view-menu="viewMenu" @back-to-menus="backToMenus" />
        </router-view>
      </main>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import LoginPage from './components/LoginPage.vue'
import { authStore, authState } from './stores/authStore.js'

export default {
  name: 'App',
  components: {
    LoginPage
  },
  setup() {
    const router = useRouter()
    
    // Use reactive state from auth store
    const isLoggedIn = computed(() => authState.isAuthenticated)
    const currentUser = computed(() => authState.user)
    
    // Handle successful login
    const handleLoginSuccess = (userData) => {
      // User is already set in the store, just emit success
      console.log('Login successful:', userData)
    }
    
    // Handle logout
    const handleLogout = () => {
      authStore.logout()
    }
    
    // Handle menu navigation from child component event
    const viewMenu = (payload) => {
      const isObj = payload && typeof payload === 'object'
      const id = isObj ? String(payload.id) : String(payload)
      const query = isObj && payload.edit ? { edit: '1' } : {}
      router.push({ name: 'menu', params: { id }, query })
    }
    
    const backToMenus = () => {
      router.push({ name: 'menus' })
    }
    
    return {
      currentUser,
      isLoggedIn,
      handleLoginSuccess,
      handleLogout,
      viewMenu,
      backToMenus
    }
  }
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: var(--very-dark-blue);
  color: var(--white);
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  align-items: center;
  gap: 2rem;
}

.header-left {
  display: flex;
  justify-content: flex-start;
}

.header-center {
  display: flex;
  justify-content: center;
}

.header-right {
  display: flex;
  justify-content: flex-end;
}

.logo-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.3s ease;
  text-decoration: none; /* remove default anchor underline/visited styling */
  display: inline-block;
}

.logo-btn:hover {
  opacity: 0.8;
}

.logo-btn h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--french-blue-contrast);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.username {
  font-weight: 500;
  font-size: 1.2rem;
  opacity: 0.9;
  color: var(--french-red);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  color: var(--white);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.navigation {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  background: none;
  border: none;
  padding: 0.75rem 1rem;
  color: var(--white);
  font-size: 1.2rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  opacity: 0.9;
  text-decoration: none; /* ensure router-link has no underline */
}

.nav-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.nav-btn.active {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.main {
  flex: 1;
  width: 100%;
  padding-top: 4rem;
}


.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-content h2 {
  color: var(--primary-color);
  margin-bottom: 1rem;
  font-size: 2rem;
}

.page-content p {
  color: var(--secondary-color);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.coming-soon {
  background: var(--primary-light);
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
}

.coming-soon p {
  color: var(--secondary-color);
  font-size: 1.2rem;
  margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .header-content {
    grid-template-columns: 1fr;
    gap: 1rem;
    text-align: center;
  }
  
  .header-left,
  .header-center,
  .header-right {
    justify-content: center;
  }
  
  .logo-btn h1 {
    font-size: 1.4rem;
  }
  
  .user-info {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .navigation {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .nav-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
}
</style>
