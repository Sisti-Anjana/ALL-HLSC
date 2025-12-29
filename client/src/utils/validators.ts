export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  return { valid: true }
}

export const isValidHour = (hour: number): boolean => {
  return hour >= 0 && hour <= 23
}

export const isValidSiteName = (siteName: string): boolean => {
  return siteName.trim().length > 0
}

export const isValidPortfolioName = (name: string): boolean => {
  return name.trim().length >= 3 && name.trim().length <= 255
}

