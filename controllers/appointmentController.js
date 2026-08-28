import Appointment from '../models/Appointment.js';
import Counter from '../models/Counter.js';
import {
  appendUGAdmission,
  appendPGAdmission,
  isPGCourse,
} from '../helpers/excelHelper.js';
import {
  sendStudentConfirmationEmail,
  sendAdminNotificationEmail,
} from '../helpers/emailHelper.js';

// Helper to generate sequential token
const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.seq;
};

/**
 * @desc    Schedule an offline or online appointment
 * @route   POST /api/appointment
 * @access  Public
 */
export const scheduleAppointment = async (req, res, next) => {
  const reqTime = new Date().toISOString();
  console.log(`\n📥 [REQUEST RECEIVED] POST /api/appointment at ${reqTime}`);
  console.log('   Payload:', JSON.stringify(req.body));

  try {
    const { name, email, phone, type, date, desk, course, category: reqCategory, admissionType } = req.body;

    if (!name || !email || !phone || !type || !date) {
      console.error('❌ [VALIDATION FAILED] Missing required appointment fields');
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, type, and date are required.',
      });
    }
    console.log('✅ [VALIDATION PASSED] Appointment payload validated');

    let token = '';
    let queueNumber = null;
    let virtualLink = null;

    if (type === 'offline') {
      const seq = await getNextSequenceValue('offline_appointments');
      const paddedSeq = String(seq).padStart(3, '0');
      token = `AIET-2026-P${paddedSeq}`;
      
      const today = new Date().toISOString().split('T')[0];
      const count = await Appointment.countDocuments({ date: today, desk, type: 'offline' });
      queueNumber = count + 1;
      
    } else if (type === 'online') {
      const seq = await getNextSequenceValue('online_appointments');
      const paddedSeq = String(seq).padStart(3, '0');
      token = `AIET-2026-O${paddedSeq}`;
      
      const randomStr = Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
      virtualLink = `https://meet.google.com/aie-${randomStr}`;
    }

    const selectedCourse = course ? course.trim() : 'CSE';
    const isPG = isPGCourse(selectedCourse) || (reqCategory && reqCategory.toUpperCase() === 'PG') || (admissionType && admissionType.toUpperCase() === 'PG');
    const category = (reqCategory || admissionType || (isPG ? 'PG' : 'UG')).toUpperCase();

    const appointment = await Appointment.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      type,
      date,
      desk: desk || '',
      course: selectedCourse,
      token,
      queueNumber,
      virtualLink
    });

    console.log(`✅ [MONGODB SAVE SUCCESS] Document created in Appointments collection. ID: ${appointment._id}`);

    // Auto-update Excel file
    const excelData = {
      token: appointment.token, 
      name: appointment.name,
      email: appointment.email,
      phone: appointment.phone,
      course: appointment.course || '',
      desk: appointment.desk || '',
      date: appointment.date || '',
      type: appointment.type,
      appointmentType: appointment.type === 'online' ? 'Online Video Counselling' : 'Offline Campus Counselling',
      createdAt: appointment.createdAt || new Date(),
    };

    try {
      if (isPG) {
        await appendPGAdmission(excelData);
      } else {
        await appendUGAdmission(excelData);
      }
      console.log('✅ [EXCEL UPDATED SUCCESS] Appointment record appended to Excel file.');
    } catch (excelErr) {
      console.error('❌ [EXCEL UPDATE FAILED] Error appending appointment to Excel:', excelErr.message);
    }

    console.log('✅ [ADMIN DASHBOARD DATA AVAILABLE] Appointment record ready for dashboard aggregation.');

    // Determine Mode for Email
    const mode = type === 'online' 
      ? 'Online Counseling (Remote)' 
      : 'Offline Campus Counseling';

    // Capture Client IP Address & Browser
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
    const ipAddress = (typeof rawIp === 'string' ? rawIp.split(',')[0] : rawIp) || '127.0.0.1';
    const browser = req.headers['user-agent'] || 'Unknown Browser';

    const now = new Date();
    const submissionDate = appointment.date || now.toISOString().split('T')[0];
    const submissionTime = `${submissionDate} ${now.toTimeString().split(' ')[0]}`;

    // Prepare Email Payload
    const emailData = {
      name: appointment.name,
      email: appointment.email,
      phone: appointment.phone,
      category,
      mode,
      course: appointment.course,
      submissionDate,
      submissionTime,
      tokenNumber: appointment.token,
      ipAddress,
      browser,
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

    res.status(201).json({
      success: true,
      message: `${type === 'offline' ? 'Campus Check-in' : 'Remote Session'} scheduled successfully.`,
      data: {
        token: appointment.token,
        queueNumber: appointment.queueNumber,
        virtualLink: appointment.virtualLink,
        desk: appointment.desk,
        date: appointment.date
      }
    });

  } catch (error) {
    console.error('❌ [ERROR IN SCHEDULE APPOINTMENT]:', error.message, error.stack);
    next(error);
  }
};
