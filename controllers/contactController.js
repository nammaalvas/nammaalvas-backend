import Contact from '../models/Contact.js';
import { appendContactEnquiry } from '../helpers/excelHelper.js';

/**
 * @desc    Submit a contact form message
 * @route   POST /api/contact
 * @access  Public
 */
export const submitContactForm = async (req, res, next) => {
  const reqTime = new Date().toISOString();
  console.log(`\n📥 [REQUEST RECEIVED] POST /api/contact at ${reqTime}`);
  console.log('   Payload:', JSON.stringify(req.body));

  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      console.error('❌ [VALIDATION FAILED] Missing name, email, or message');
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required.',
      });
    }
    console.log('✅ [VALIDATION PASSED] Contact payload validated');

    // Prevent duplicate submissions from same email within 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentSubmission = await Contact.findOne({
      email: email.toLowerCase().trim(),
      createdAt: { $gte: oneMinuteAgo }
    });

    if (recentSubmission) {
      console.warn(`⚠️ [DUPLICATE CHECK FAILED] Recent contact submission from email ${email}`);
      return res.status(429).json({
        success: false,
        message: 'You have already submitted a message recently. Please wait a minute.'
      });
    }
    console.log('✅ [DUPLICATE CHECK PASSED] Contact submission allowed');

    const contact = await Contact.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim(),
      ipAddress: req.ip
    });

    console.log(`✅ [MONGODB SAVE SUCCESS] Document created in Contact collection. ID: ${contact._id}`);

    // Auto-update Contact_Enquiries.xlsx
    try {
      await appendContactEnquiry(contact);
      console.log('✅ [EXCEL UPDATED SUCCESS] Written to Contact_Enquiries.xlsx');
    } catch (excelErr) {
      console.error('❌ [EXCEL UPDATE FAILED] Error appending contact enquiry:', excelErr.message);
    }

    console.log('✅ [ADMIN DASHBOARD DATA AVAILABLE] Contact enquiry synced successfully.');

    res.status(201).json({
      success: true,
      message: 'Your message has been received successfully.'
    });
  } catch (error) {
    console.error('❌ [ERROR IN CONTACT FORM]:', error.message, error.stack);
    next(error);
  }
};
