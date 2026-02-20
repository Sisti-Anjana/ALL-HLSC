import { Router } from 'express'
import { adminController } from '../controllers/admin.controller'
import { authenticate } from '../middleware/auth.middleware'
import { tenantIsolation } from '../middleware/tenantIsolation.middleware'

const router = Router()

router.use(authenticate)
router.use(tenantIsolation)

// Users
router.get('/users', adminController.getUsers)
router.get('/users/check/:email', adminController.checkUser)
router.post('/users', adminController.createUser)
router.put('/users/:id', adminController.updateUser)
router.delete('/users/:id', adminController.deleteUser)

// Monitored Personnel
router.get('/personnel', adminController.getPersonnel)
router.post('/personnel', adminController.createPersonnel)
router.put('/personnel/:id', adminController.updatePersonnel)
router.delete('/personnel/:id', adminController.deletePersonnel)

// Locks
router.get('/locks', adminController.getLocks)
router.post('/locks/:id/unlock', adminController.unlockPortfolio)
router.post('/locks/unlock-all', adminController.unlockAllLocksForUser)

// Admin Logs
router.get('/logs', adminController.getLogs)
router.post('/logs', adminController.createLog)

// Tenant Management (Super Admin Only)
router.get('/tenants', adminController.getAllTenants)
router.get('/tenants/:id', adminController.getTenantById)
router.post('/tenants', adminController.createTenant)
router.put('/tenants/:id', adminController.updateTenant)
router.delete('/tenants/:id', adminController.deleteTenant)

export default router

