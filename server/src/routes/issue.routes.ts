import { Router } from 'express'
import { issueController } from '../controllers/issue.controller'
import { authenticate } from '../middleware/auth.middleware'
import { tenantIsolation } from '../middleware/tenantIsolation.middleware'

const router = Router()

router.use(authenticate)
router.use(tenantIsolation)

router.get('/', issueController.getAll)
router.get('/:id', issueController.getById)
router.post('/', issueController.create)
router.put('/:id', issueController.update)
router.delete('/:id', issueController.delete)
router.post('/bulk', issueController.bulkCreate)
router.post('/export', issueController.export)

export default router

