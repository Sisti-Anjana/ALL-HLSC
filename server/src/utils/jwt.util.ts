import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from '../config/constants'

export interface TokenPayload {
  userId: string
  tenantId: string | null // Super admin can have null tenantId
  email: string
  role: string
}

export const generateToken = (payload: TokenPayload): string => {
  // Ensure expiresIn is a valid string or number for jwt.sign
  const expiresIn: string | number = config.JWT_EXPIRES_IN || '7d'
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn } as SignOptions)
}

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload
}

