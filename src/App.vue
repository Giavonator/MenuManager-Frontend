<template>
  <div id="app">
    <header class="header">
      <h1>Menu Manager</h1>
      <p>Systematic organization of weekly grouping of manually created recipes</p>
    </header>
    
    <main class="main">
      <div class="welcome">
        <h2>Welcome to Menu Manager</h2>
        <p>Your Vue.js application is ready to go!</p>
        <button @click="count++" class="counter-btn">
          Count is: {{ count }}
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'App',
  setup() {
    const count = ref(0)
    
    return {
      count
    }
  }
}
</script>

<style scoped>
.header {
  text-align: center;
  padding: 2rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 600;
}

.header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.main {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
}

.welcome {
  text-align: center;
  padding: 3rem 0;
}

.welcome h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 2rem;
}

.welcome p {
  color: #7f8c8d;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.counter-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.counter-btn:hover {
  background: #369870;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}
</style>
