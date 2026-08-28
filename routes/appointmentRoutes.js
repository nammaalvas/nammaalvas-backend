import express from 'express';
import { scheduleAppointment } from '../controllers/appointmentController.js';
import { validateAppointment } from '../validators/appointmentValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

router.post('/', validateAppointment, validateRequest, scheduleAppointment);

export default router;
