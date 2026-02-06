import { Router } from 'express'
import authRoutes from './auth.routes'
import portfolioRoutes from './portfolio.routes'
import issueRoutes from './issue.routes'
import analyticsRoutes from './analytics.routes'
import adminRoutes from './admin.routes'


const router = Router()

router.use('/auth', authRoutes)
router.use('/portfolios', portfolioRoutes)
router.use('/issues', issueRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/admin', adminRoutes)


export default router

