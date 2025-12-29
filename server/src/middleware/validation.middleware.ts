import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ')
    return res.status(400).json({ 
      success: false, 
      error: errorMessages,
      errors: errors.array() 
    })
  }
  next()
}

