import { Router } from 'express'
import { analyticsController } from '../controllers/analytics.controller'
import { authenticate } from '../middleware/auth.middleware'
import { tenantIsolation } from '../middleware/tenantIsolation.middleware'

const router = Router()

router.use(authenticate)
router.use(tenantIsolation)

router.get('/dashboard', analyticsController.getDashboardStats)
router.get('/hourly-coverage', analyticsController.getHourlyCoverage)
router.get('/hourly-coverage-range', analyticsController.getHourlyCoverageWithDateRange)
router.get('/issues-over-time', analyticsController.getIssuesOverTime)
router.get('/portfolio-heatmap', analyticsController.getPortfolioHeatmap)
router.get('/coverage-matrix', analyticsController.getCoverageMatrix)
router.get('/portfolio-activity', analyticsController.getPortfolioActivity)

export default router

