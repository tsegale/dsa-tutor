import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { login, register } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'

const inputClassName =
  'w-full rounded-md border-2 border-border px-3 py-2 text-sm outline-none transition-colors focus:border-text-muted'

function LoginForm() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      await refreshUser()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm font-medium text-text-primary">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  )
}

function RegisterForm() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register(email, password, name)
      await refreshUser()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-name" className="text-sm font-medium text-text-primary">
          Name
        </label>
        <input
          id="register-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-sm font-medium text-text-primary">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating account...' : 'Register'}
      </Button>
    </form>
  )
}

function BarChartIllustration() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none">
      <rect x="10" y="90" width="30" height="60" rx="4" fill="#818CF8" />
      <rect x="55" y="60" width="30" height="90" rx="4" fill="#A5B4FC" />
      <rect x="100" y="20" width="30" height="130" rx="4" fill="#C7D2FE" />
      <rect x="145" y="75" width="30" height="75" rx="4" fill="#A5B4FC" />
      <rect x="190" y="45" width="20" height="105" rx="4" fill="#818CF8" />
      <path d="M10 30l35 15 45-25 45 10 40-20" stroke="#F59E0B" strokeWidth={3} strokeLinecap="round" fill="none" />
      <circle cx="10" cy="30" r="4" fill="#F59E0B" />
      <circle cx="45" cy="45" r="4" fill="#F59E0B" />
      <circle cx="90" cy="20" r="4" fill="#F59E0B" />
      <circle cx="135" cy="30" r="4" fill="#F59E0B" />
      <circle cx="175" cy="10" r="4" fill="#F59E0B" />
    </svg>
  )
}

export default function AuthPage() {
  return (
    <div className="flex h-screen w-full">
      <div className="hidden flex-col items-center justify-center gap-8 bg-[#312E81] p-12 text-white md:flex md:w-1/2">
        <BarChartIllustration />
        <div className="text-center">
          <h1 className="text-3xl font-bold">DSA Tutor</h1>
          <p className="mt-2 max-w-xs text-sm text-indigo-200">
            Learn data structures and algorithms by predicting the next step, not just watching it happen.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-6 md:w-1/2">
        <div className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-center text-lg font-semibold text-text-primary md:hidden">DSA Tutor</h1>
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Register
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
