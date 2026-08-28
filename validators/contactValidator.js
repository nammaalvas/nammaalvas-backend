import { body } from 'express-validator';

export const validateContact = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('message').notEmpty().withMessage('Message cannot be empty').trim()
    .isLength({ min: 10 }).withMessage('Message must be at least 10 characters long'),
];
