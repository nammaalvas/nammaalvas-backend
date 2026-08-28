import Admission from '../models/Admission.js';
import {
  appendUGAdmission,
  appendPGAdmission,
  isPGCourse,
} from '../helpers/excelHelper.js';
import {
  sendStudentConfirmationEmail,
  sendAdminNotificationEmail,
} from '../helpers/emailHelper.js';

/**
 * @desc    Submit an online seat booking / admission request
 * @route   POST /api/admission
 * @access  Public
 */
export const createAdmission = async (req, res, next) => {
  const reqTime = new Date().toISOString();
  console.log(`\n📥 [REQUEST RECEIVED] POST /api/admission at ${reqTime}`);
  console.log('   Payload:', JSON.stringify(req.body));

  try {
    const {
      name,
      email,
      phone,
      course,
      branch,
      category: reqCategory,
      admissionType,
      mode: reqMode,
      appointmentType,
    } = req.body;

    const selectedCourse = (course || branch || '').trim();

    if (!name || !email || !phone || !selectedCourse) {
      console.error('❌ [VALIDATION FAILED] Missing required fields in body');
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and course/branch are required fields.',
      });
    }
    console.log('✅ [VALIDATION PASSED] Name, email, phone, and course/branch verified');

    const normEmail = email.toLowerCase().trim();
    const normPhone = phone.trim();
    const normCourse = selectedCourse;

    // Check for existing admission to prevent duplicate submissions
    const existingAdmission = await Admission.findOne({
      email: normEmail,
      phone: normPhone,
      course: normCourse,
    });

    if (existingAdmission) {
      console.warn(`⚠️ [DUPLICATE CHECK FAILED] Admission already exists for Email: ${normEmail}, Phone: ${normPhone}, Course: ${normCourse}`);
      return res.status(409).json({
        success: false,
        message: 'An admission request with this email, phone, and course already exists.',
      });
    }
    console.log('✅ [DUPLICATE CHECK PASSED] No duplicate admission found');

    const isPG = isPGCourse(normCourse);
    const computedCategory = isPG ? 'PG' : 'UG';
    const category = (reqCategory || admissionType || computedCategory).toUpperCase();

    // Mode: Online Seat Booking / Offline Campus Counseling / Online Counseling (Remote)
    const mode = reqMode || appointmentType || 'Online Seat Booking';

    const year = new Date().getFullYear();
    const tokenNumber = `AIET-${year}-${category}-${Math.floor(1000 + Math.random() * 9000)}`;

    const now = new Date();
    const admissionDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const admissionTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
    const formattedTime = `${admissionDate} ${admissionTime}`;

    // Capture IP Address & User Agent Browser
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
    const ipAddress = (typeof rawIp === 'string' ? rawIp.split(',')[0] : rawIp) || '127.0.0.1';
    const browser = req.headers['user-agent'] || 'Unknown Browser';

    const admission = await Admission.create({
      tokenNumber,
      name: name.trim(),
      email: normEmail,
      phone: normPhone,
      course: normCourse,
      branch: normCourse,
      category,
      appointmentType: mode,
      mode,
      seatSlot: 'Provisionally Reserved',
      status: 'Pending',
      admissionDate,
      admissionTime,
      ipAddress,
      browser,
    });

    console.log(`✅ [MONGODB SAVE SUCCESS] Document created in Admissions collection. ID: ${admission._id}`);

    const excelData = {
      tokenNumber: admission.tokenNumber,
      name: admission.name,
      email: admission.email,
      phone: admission.phone,
      course: admission.course,
      appointmentType: admission.mode,
      category: admission.category,
      createdAt: admission.createdAt,
    };

    // Auto-update Excel file based on course (UG / PG)
    try {
      if (isPG) {
        await appendPGAdmission(excelData);
      } else {
        await appendUGAdmission(excelData);
      }
      console.log('✅ [EXCEL UPDATED SUCCESS] Admission row appended to Excel report file.');
    } catch (excelErr) {
      console.error('❌ [EXCEL UPDATE FAILED] Error appending row to Excel file:', excelErr.message);
    }

    console.log('✅ [ADMIN DASHBOARD DATA AVAILABLE] Record synced successfully for real-time dashboard viewing.');

    // Dispatch Student Confirmation Email & Admin Notification Email
    const emailData = {
      name: admission.name,
      email: admission.email,
      phone: admission.phone,
      category: admission.category,
      mode: admission.mode,
      course: admission.course,
      submissionDate: admission.admissionDate,
      submissionTime: formattedTime,
      tokenNumber: admission.tokenNumber,
      ipAddress: admission.ipAddress,
      browser: admission.browser,
    };

    // Dispatch Student Confirmation Email & Admin Notification Email
    Promise.allSettled([
      sendStudentConfirmationEmail(emailData),
      sendAdminNotificationEmail(emailData),
    ]).then((results) => {
      const studentRes = results[0];
      const adminRes = results[1];

      if (studentRes.status === 'fulfilled' && studentRes.value?.success) {
        console.log('✅ [STUDENT EMAIL SUCCESS] Student confirmation email processed.');
      } else {
        const errVal = studentRes.status === 'rejected' ? studentRes.reason : studentRes.value?.error;
        console.error('❌ [STUDENT EMAIL ERROR LOG]:', errVal);
      }

      if (adminRes.status === 'fulfilled' && adminRes.value?.success) {
        console.log('✅ [ADMIN EMAIL SUCCESS] Admin notification email processed.');
      } else {
        const errVal = adminRes.status === 'rejected' ? adminRes.reason : adminRes.value?.error;
        console.error('❌ [ADMIN EMAIL ERROR LOG]:', errVal);
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Seat booking request saved successfully.',
      emaildata: emailData,
      data: {
        id: admission._id,
        tokenNumber: admission.tokenNumber,
        name: admission.name,
        course: admission.course,
        category: admission.category,
        mode: admission.mode,
      },
    });
  } catch (error) {
    console.error('❌ [ERROR IN CREATE ADMISSION]:', error.message, error.stack);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An admission request with this email, phone, and course already exists.',
      });
    }
    next(error);
  }
};
