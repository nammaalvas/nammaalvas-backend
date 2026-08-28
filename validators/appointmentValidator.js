import { body } from 'express-validator';

export const validateAppointment = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email')
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Valid email address is required')
    .normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('type').isIn(['offline', 'online']).withMessage('Type must be offline or online'),
  body('date').notEmpty().withMessage('Date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  body('desk').if(body('type').equals('offline')).notEmpty().withMessage('Desk selection is required for offline visits'),
  body('course').if(body('type').equals('online')).notEmpty().withMessage('Course selection is required for online visits'),
];
