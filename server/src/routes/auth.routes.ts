import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { validateLogin, validateRegister } from '../validators/auth.validator'

const router = Router()

router.post('/login', validateLogin, authController.login)
router.post('/admin/login', validateLogin, authController.adminLogin)
router.post('/register', validateRegister, authController.register)
router.post('/logout', authController.logout)
router.post('/refresh', authController.refreshToken)
router.get('/me', authController.getCurrentUser)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)

export default router

