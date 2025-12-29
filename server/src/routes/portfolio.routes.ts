import { Router } from 'express'
import { portfolioController } from '../controllers/portfolio.controller'
import { authenticate } from '../middleware/auth.middleware'
import { tenantIsolation, verifyTenantOwnership } from '../middleware/tenantIsolation.middleware'

const router = Router()

// Apply authentication and tenant isolation to all routes
router.use(authenticate)
router.use(tenantIsolation)

router.get('/', portfolioController.getAll)
router.get('/:id', portfolioController.getById)
router.post('/', portfolioController.create)
router.put('/:id', portfolioController.update)
router.delete('/:id', portfolioController.delete)
router.post('/:id/lock', portfolioController.lock)
router.post('/:id/unlock', portfolioController.unlock)
router.put('/:id/all-sites-checked', portfolioController.updateAllSitesChecked)

export default router

