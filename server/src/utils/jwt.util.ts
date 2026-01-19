import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from '../config/constants'

export interface TokenPayload {
  userId: string
  tenantId: string | null // Super admin can have null tenantId
  email: string
  role: string
}

export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: config.JWT_EXPIRES_IN,
  }
  return jwt.sign(payload, config.JWT_SECRET, options)
}

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload
}

