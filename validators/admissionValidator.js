import { body } from 'express-validator';

export const validateAdmission = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number format'),
  body('course').optional().trim(),
  body('branch').optional().trim(),
  body('mode').optional().trim(),
  body('appointmentType').optional().trim(),
  body('admissionType').optional().trim(),
  body('category').optional().trim(),
  body().custom((value, { req }) => {
    if (!req.body.course && !req.body.branch) {
      throw new Error('Course or branch selection is required');
    }
    return true;
  }),
];
