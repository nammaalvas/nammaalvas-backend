import express from 'express';
import {
  loginAdmin,
  getAdminProfile,
  getDashboardStats,
  getUGReports,
  getPGReports,
  downloadUGExcel,
  downloadPGExcel,
  getFilteredReports,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

const ADMIN_ROLES = ['Super Admin', 'Principal', 'AO', 'Admission Staff'];

// Public Admin Auth Route
router.post('/auth/login', loginAdmin);

// All subsequent routes are protected & RBAC authorized
router.use(protect);
router.use(authorize(...ADMIN_ROLES));

router.get('/auth/me', getAdminProfile);
router.get('/dashboard', getDashboardStats);
router.get('/reports/ug', getUGReports);
router.get('/reports/pg', getPGReports);
router.get('/reports/download/ug', downloadUGExcel);
router.get('/reports/download/pg', downloadPGExcel);
router.get('/reports/filter', getFilteredReports);

export default router;
