import { useState } from 'react'
import { Modal } from '@components/organisms'
import { Button, Input } from '@components/atoms'
import { useAuth } from '@contexts/AuthContext'
import type { LoginForm, RegisterForm } from '../../../types'
import toast from 'react-hot-toast'

export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) => {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [loading, setLoading] = useState(false)
  
  // Stable close handler to prevent re-renders
  const handleClose = () => {
    onClose()
  }
  
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  })
  
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!loginForm.email || !loginForm.password) {
      toast.error('Please fill in all fields')
      return
    }
    
    setLoading(true)
    try {
      await login(loginForm)
      handleClose()
      setLoginForm({ email: '', password: '' })
    } catch {
      // Error handled in context
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!registerForm.firstName || !registerForm.lastName || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (registerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setLoading(true)
    try {
      await register(registerForm)
      handleClose()
      setRegisterForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
      })
    } catch {
      // Error handled in context
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setLoginForm({ email: '', password: '' })
    setRegisterForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'login' ? 'Welcome Back!' : 'Create Account'}
      size="md"
      showCloseButton={true}
      closeOnOverlayClick={true}
    >
      {mode === 'login' ? (
        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              required
              fullWidth
            />
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
              fullWidth
            />
          </div>
          
          <div className="mt-6 space-y-4">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={loading}
              disabled={loading}
            >
              Login
            </Button>
            
            <p className="text-center text-gray-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={switchMode}
                className="text-primary hover:text-highlight-1 transition-colors"
              >
                Register
              </button>
            </p>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                label="First Name"
                placeholder="Enter your first name"
                value={registerForm.firstName}
                onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                required
                fullWidth
              />
              <Input
                type="text"
                label="Last Name"
                placeholder="Enter your last name"
                value={registerForm.lastName}
                onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                required
                fullWidth
              />
            </div>
            <Input
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              required
              fullWidth
            />
            <Input
              type="password"
              label="Password"
              placeholder="Create a password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              helperText="Minimum 6 characters"
              required
              fullWidth
            />
            <Input
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
              required
              fullWidth
            />
          </div>
          
          <div className="mt-6 space-y-4">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={loading}
              disabled={loading}
            >
              Create Account
            </Button>
            
            <p className="text-center text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={switchMode}
                className="text-primary hover:text-highlight-1 transition-colors"
              >
                Login
              </button>
            </p>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default AuthModal