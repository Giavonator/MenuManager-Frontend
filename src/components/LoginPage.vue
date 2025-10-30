<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>Welcome Back</h1>
        <p>Sign in to your Menu Manager account</p>
        <div class="connection-status" :class="connectionStatus">
          <span v-if="connectionStatus === 'checking'">🔄 Checking connection...</span>
          <span v-else-if="connectionStatus === 'connected'">✅ Connected to server</span>
          <div v-else-if="connectionStatus === 'disconnected'" class="disconnected-content">
            <span>❌ Server connection failed</span>
            <button @click="retryConnection" class="retry-btn">Retry</button>
          </div>
        </div>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            :disabled="loading"
            placeholder="Enter your username"
            class="form-input"
            :class="{ 'error': errors.username }"
          />
          <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            :disabled="loading"
            placeholder="Enter your password"
            class="form-input"
            :class="{ 'error': errors.password }"
          />
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>
        
        <button 
          type="submit" 
          :disabled="loading || !isFormValid"
          class="login-button"
          :class="{ 'loading': loading }"
        >
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Signing In...' : 'Sign In' }}
        </button>
        
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
      </form>
      
      <div class="login-footer">
        <p>Don't have an account? <a href="#" @click.prevent="showRegister = true">Register here</a></p>
      </div>
    </div>
    
    <!-- Registration Modal -->
    <div v-if="showRegister" class="modal-overlay" @click="showRegister = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Create Account</h2>
          <button @click="showRegister = false" class="close-button">&times;</button>
        </div>
        
        <form @submit.prevent="handleRegister" class="register-form">
          <div class="form-group">
            <label for="reg-username">Username</label>
            <input
              id="reg-username"
              v-model="registerForm.username"
              type="text"
              required
              :disabled="registerLoading"
              placeholder="Choose a username"
              class="form-input"
              :class="{ 'error': registerErrors.username }"
            />
            <span v-if="registerErrors.username" class="error-message">{{ registerErrors.username }}</span>
          </div>
          
          <div class="form-group">
            <label for="reg-password">Password</label>
            <input
              id="reg-password"
              v-model="registerForm.password"
              type="password"
              required
              :disabled="registerLoading"
              placeholder="Choose a password"
              class="form-input"
              :class="{ 'error': registerErrors.password }"
            />
            <span v-if="registerErrors.password" class="error-message">{{ registerErrors.password }}</span>
          </div>
          
          <div class="form-group">
            <label for="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              v-model="registerForm.confirmPassword"
              type="password"
              required
              :disabled="registerLoading"
              placeholder="Confirm your password"
              class="form-input"
              :class="{ 'error': registerErrors.confirmPassword }"
            />
            <span v-if="registerErrors.confirmPassword" class="error-message">{{ registerErrors.confirmPassword }}</span>
          </div>
          
          <button 
            type="submit" 
            :disabled="registerLoading || !isRegisterFormValid"
            class="register-button"
            :class="{ 'loading': registerLoading }"
          >
            <span v-if="registerLoading" class="spinner"></span>
            {{ registerLoading ? 'Creating Account...' : 'Create Account' }}
          </button>
          
          <div v-if="registerErrorMessage" class="error-banner">
            {{ registerErrorMessage }}
          </div>
          
          <div v-if="registerSuccessMessage" class="success-banner">
            {{ registerSuccessMessage }}
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted } from 'vue'
import { authStore } from '../stores/authStore.js'

export default {
  name: 'LoginPage',
  emits: ['login-success'],
  setup(props, { emit }) {
    // Login form state
    const form = reactive({
      username: '',
      password: ''
    })
    
    const errors = reactive({
      username: '',
      password: ''
    })
    
    const loading = ref(false)
    const errorMessage = ref('')
    
    // Registration form state
    const showRegister = ref(false)
    const registerForm = reactive({
      username: '',
      password: '',
      confirmPassword: ''
    })
    
    const registerErrors = reactive({
      username: '',
      password: '',
      confirmPassword: ''
    })
    
    const registerLoading = ref(false)
    const registerErrorMessage = ref('')
    const registerSuccessMessage = ref('')
    const connectionStatus = ref('checking')
    
    // Form validation
    const isFormValid = computed(() => {
      return form.username.trim() && form.password.trim()
    })
    
    // Test backend connection
    const testConnection = async () => {
      console.log('Testing backend connection...')
      const isConnected = await authStore.testConnection()
      connectionStatus.value = isConnected ? 'connected' : 'disconnected'
      console.log('Backend connection status:', connectionStatus.value)
    }
    
    // Retry connection
    const retryConnection = async () => {
      connectionStatus.value = 'checking'
      await testConnection()
    }
    
    // Test backend connection on component mount
    onMounted(async () => {
      await testConnection()
    })
    
    const isRegisterFormValid = computed(() => {
      return registerForm.username.trim() && 
             registerForm.password.trim() && 
             registerForm.confirmPassword.trim() &&
             registerForm.password === registerForm.confirmPassword
    })
    
    // Clear errors
    const clearErrors = () => {
      errors.username = ''
      errors.password = ''
      errorMessage.value = ''
    }
    
    const clearRegisterErrors = () => {
      registerErrors.username = ''
      registerErrors.password = ''
      registerErrors.confirmPassword = ''
      registerErrorMessage.value = ''
      registerSuccessMessage.value = ''
    }
    
    // Login handler
    const handleLogin = async () => {
      clearErrors()
      loading.value = true
      
      try {
        const result = await authStore.login(form.username, form.password)
        
        if (result.success) {
          emit('login-success', result.user)
        } else {
          errorMessage.value = result.error || 'Login failed. Please try again.'
        }
      } catch (error) {
        console.error('Login error:', error)
        errorMessage.value = error.message || 'Login failed. Please try again.'
      } finally {
        loading.value = false
      }
    }
    
    // Registration handler
    const handleRegister = async () => {
      clearRegisterErrors()
      
      // Validate passwords match
      if (registerForm.password !== registerForm.confirmPassword) {
        registerErrors.confirmPassword = 'Passwords do not match'
        return
      }
      
      registerLoading.value = true
      
      try {
        const result = await authStore.register(registerForm.username, registerForm.password)
        
        if (result.success) {
          registerSuccessMessage.value = 'Account created successfully! You can now sign in.'
          
          // Clear form and close modal after a delay
          setTimeout(() => {
            showRegister.value = false
            registerForm.username = ''
            registerForm.password = ''
            registerForm.confirmPassword = ''
            registerSuccessMessage.value = ''
          }, 2000)
        } else {
          registerErrorMessage.value = result.error || 'Registration failed. Please try again.'
        }
      } catch (error) {
        console.error('Registration error:', error)
        registerErrorMessage.value = error.message || 'Registration failed. Please try again.'
      } finally {
        registerLoading.value = false
      }
    }
    
    return {
      form,
      errors,
      loading,
      errorMessage,
      showRegister,
      registerForm,
      registerErrors,
      registerLoading,
      registerErrorMessage,
      registerSuccessMessage,
      connectionStatus,
      isFormValid,
      isRegisterFormValid,
      handleLogin,
      handleRegister,
      retryConnection
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  padding: 2rem;
}

.login-card {
  background: var(--white);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 3rem;
  width: 100%;
  max-width: 400px;
  position: relative;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h1 {
  color: var(--primary-color);
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 600;
}

.login-header p {
  color: var(--secondary-color);
  margin: 0;
  font-size: 1rem;
}

.connection-status {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

.connection-status.checking {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
}

.connection-status.connected {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.connection-status.disconnected {
  background: var(--error-light);
  color: var(--error-red);
  border: 1px solid var(--accent-red);
}

.disconnected-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.retry-btn {
  background: var(--accent-red);
  color: var(--white);
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: var(--error-red);
  transform: translateY(-1px);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--primary-color);
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input {
  padding: 0.875rem 1rem;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #fafbfc;
  color: var(--primary-color);
}

.form-input:focus {
  outline: none;
  border-color: var(--secondary-color);
  background: var(--white);
  box-shadow: 0 0 0 3px var(--secondary-light);
  color: var(--primary-color);
}

.form-input::placeholder {
  color: #7f8c8d;
  opacity: 1;
}

/* Ensure password field shows asterisks */
input[type="password"] {
  -webkit-text-security: disc;
  text-security: disc;
  font-family: monospace;
}

.form-input.error {
  border-color: var(--accent-red);
  background: var(--error-light);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: var(--primary-color);
}

.error-message {
  color: var(--accent-red);
  font-size: 0.875rem;
  font-weight: 500;
}

.login-button {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: var(--white);
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--primary-dark);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.login-button.loading {
  background: #95a5a6;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-banner {
  background: var(--error-light);
  color: var(--accent-red);
  padding: 0.875rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--accent-red);
  font-size: 0.875rem;
  font-weight: 500;
}

.success-banner {
  background: #f0fdf4;
  color: #16a34a;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  font-size: 0.875rem;
  font-weight: 500;
}

.login-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e1e8ed;
}

.login-footer p {
  color: var(--secondary-color);
  margin: 0;
  font-size: 0.9rem;
}

.login-footer a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.login-footer a:hover {
  text-decoration: underline;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background: var(--white);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid #e1e8ed;
}

.modal-header h2 {
  color: var(--primary-color);
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--secondary-color);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: var(--primary-light);
  color: var(--primary-color);
}

.register-form {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.register-button {
  background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
  color: var(--white);
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
}

.register-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--secondary-light);
}

.register-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.register-button.loading {
  background: #95a5a6;
}

/* Responsive Design */
@media (max-width: 480px) {
  .login-container {
    padding: 1rem;
  }
  
  .login-card {
    padding: 2rem;
  }
  
  .modal-content {
    margin: 1rem;
  }
  
  .modal-header,
  .register-form {
    padding: 1.5rem;
  }
}
</style>
