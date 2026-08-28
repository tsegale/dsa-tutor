export interface RegisterDto {
  email: string
  password: string
  name: string
  role?: 'STUDENT' | 'EDUCATOR'
}

export interface LoginDto {
  email: string
  password: string
}

export interface AuthResponseDto {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: string
    xpTotal: number
    streakCount: number
  }
}
