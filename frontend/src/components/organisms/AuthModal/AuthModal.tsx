import { useState, useRef, useEffect } from 'react'
import { Modal } from '@components/organisms'
import { Button, Input } from '@components/atoms'
import { useAuth } from '@contexts/AuthContext'
import type { LoginForm, RegisterForm } from '../../../types'
import {
  validatePassword,
  validatePasswordMatch,
  getPasswordErrorMessages,
  PASSWORD_HELPER_TEXT,
  mapBackendPasswordError,
} from '../../../utils/passwordValidator'
import { parseLoginError } from '../../../utils/loginErrorHandler'

export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) => {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [loading, setLoading] = useState(false)

  // Refs for focus management
  const firstNameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)
  const loginEmailRef = useRef<HTMLInputElement>(null)
  const loginPasswordRef = useRef<HTMLInputElement>(null)

  // Stable close handler to prevent re-renders
  const handleClose = () => {
    onClose()
  }

  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  })

  // Login error state
  const [loginError, setLoginError] = useState<{
    message: string
    warningMessage?: string
  } | null>(null)

  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Validation state for registration form
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
  const [backendPasswordError, setBackendPasswordError] = useState<string | null>(null)
  const [backendGeneralError, setBackendGeneralError] = useState<string | null>(null)

  // Reset validation state when switching modes
  useEffect(() => {
    setPasswordTouched(false)
    setConfirmPasswordTouched(false)
    setBackendPasswordError(null)
    setBackendGeneralError(null)
    setLoginError(null)
  }, [mode])

  // Validate password in real-time
  const passwordValidation = validatePassword(registerForm.password)
  const passwordErrors = passwordTouched && !passwordValidation.valid
    ? getPasswordErrorMessages(passwordValidation.errors)
    : []

  // Check if passwords match
  const passwordsMatch = validatePasswordMatch(registerForm.password, registerForm.confirmPassword)
  const confirmPasswordError =
    confirmPasswordTouched && registerForm.confirmPassword && !passwordsMatch
      ? 'Passwords do not match'
      : undefined

  // Check if form is valid for submission
  const isRegisterFormValid =
    registerForm.firstName &&
    registerForm.lastName &&
    registerForm.email &&
    registerForm.password &&
    registerForm.confirmPassword &&
    passwordValidation.valid &&
    passwordsMatch

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous login error
    setLoginError(null)

    if (!loginForm.email || !loginForm.password) {
      setLoginError({
        message: 'Please fill in all fields',
      })
      // Focus on first empty field
      if (!loginForm.email && loginEmailRef.current) {
        loginEmailRef.current.focus()
      } else if (!loginForm.password && loginPasswordRef.current) {
        loginPasswordRef.current.focus()
      }
      return
    }

    setLoading(true)
    try {
      await login(loginForm)
      handleClose()
      setLoginForm({ email: '', password: '' })
      setLoginError(null)
    } catch (error: unknown) {
      // Parse and display backend error
      const parsedError = parseLoginError(error)
      setLoginError({
        message: parsedError.message,
        warningMessage: parsedError.warningMessage,
      })

      // Focus on email field for credentials errors
      if (loginEmailRef.current) {
        loginEmailRef.current.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous backend errors
    setBackendPasswordError(null)
    setBackendGeneralError(null)

    // Mark all fields as touched for validation
    setPasswordTouched(true)
    setConfirmPasswordTouched(true)

    // Validate all required fields
    if (!registerForm.firstName || !registerForm.lastName || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      // Focus on first empty field
      if (!registerForm.firstName && firstNameRef.current) {
        firstNameRef.current.focus()
      }
      return
    }

    // Validate password requirements (frontend)
    if (!passwordValidation.valid) {
      // Focus on password field
      if (passwordRef.current) {
        passwordRef.current.focus()
      }
      return
    }

    // Validate password match
    if (!passwordsMatch) {
      // Focus on confirm password field
      if (confirmPasswordRef.current) {
        confirmPasswordRef.current.focus()
      }
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
      setPasswordTouched(false)
      setConfirmPasswordTouched(false)
    } catch (error: unknown) {
      // Handle backend errors
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'

      // Try to map to password-specific error
      const passwordError = mapBackendPasswordError(errorMessage)

      if (passwordError) {
        // Password validation error from backend
        setBackendPasswordError(passwordError)
        if (passwordRef.current) {
          passwordRef.current.focus()
        }
      } else {
        // General error (email already exists, etc.)
        setBackendGeneralError(errorMessage)
      }
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
          {/* Login error display */}
          {loginError && (
            <div
              className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm"
              role="alert"
              aria-live="assertive"
            >
              <p className="font-medium">{loginError.message}</p>
              {loginError.warningMessage && (
                <p className="mt-1 text-xs">{loginError.warningMessage}</p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <Input
              ref={loginEmailRef}
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={loginForm.email}
              onChange={(e) => {
                setLoginForm({ ...loginForm, email: e.target.value })
                // Clear error when user starts typing
                if (loginError) {
                  setLoginError(null)
                }
              }}
              required
              fullWidth
            />
            <Input
              ref={loginPasswordRef}
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={loginForm.password}
              onChange={(e) => {
                setLoginForm({ ...loginForm, password: e.target.value })
                // Clear error when user starts typing
                if (loginError) {
                  setLoginError(null)
                }
              }}
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
          {/* Show general backend error at top of form */}
          {backendGeneralError && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm" role="alert">
              {backendGeneralError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                ref={firstNameRef}
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
              ref={passwordRef}
              type="password"
              label="Password"
              placeholder="Create a password"
              value={registerForm.password}
              onChange={(e) => {
                setRegisterForm({ ...registerForm, password: e.target.value })
                // Clear backend error when user starts typing
                if (backendPasswordError) {
                  setBackendPasswordError(null)
                }
              }}
              onBlur={() => setPasswordTouched(true)}
              helperText={!passwordTouched && !backendPasswordError ? PASSWORD_HELPER_TEXT : undefined}
              errorList={passwordErrors.length > 0 ? passwordErrors : undefined}
              error={backendPasswordError || undefined}
              required
              fullWidth
            />
            <Input
              ref={confirmPasswordRef}
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
              onBlur={() => setConfirmPasswordTouched(true)}
              error={confirmPasswordError}
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
              disabled={loading || !isRegisterFormValid}
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