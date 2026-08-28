import express from 'express';
import { submitContactForm } from '../controllers/contactController.js';
import { validateContact } from '../validators/contactValidator.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { contactLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', contactLimiter, validateContact, validateRequest, submitContactForm);

export default router;
