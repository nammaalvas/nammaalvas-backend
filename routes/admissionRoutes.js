import express from 'express';
import { createAdmission } from '../controllers/admissionController.js';
import { validateAdmission } from '../validators/admissionValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

router.post('/', validateAdmission, validateRequest, createAdmission);

export default router;
