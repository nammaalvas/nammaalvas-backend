import jwt from 'jsonwebtoken';
import fs from 'fs';
import User from '../models/User.js';
import Admission from '../models/Admission.js';
import Appointment from '../models/Appointment.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';
import { getExcelFilePath, generateFilteredExcelBuffer, isPGCourse } from '../helpers/excelHelper.js';

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * IST Timezone Helpers (+05:30)
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19,800,000 ms

const getISTComponents = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false,
  }).formatToParts(date);

  let year, month, day;
  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10) - 1;
    if (part.type === 'day') day = parseInt(part.value, 10);
  }
  return { year, month, day };
};

const makeISTDate = (year, month, day, hours = 0, minutes = 0, seconds = 0, ms = 0) => {
  return new Date(Date.UTC(year, month, day, hours, minutes, seconds, ms) - IST_OFFSET_MS);
};

const getISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
};

const getISTTimeString = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
};

/**
 * Helper to build Date range filter for Asia/Kolkata (IST) local timezone
 */
const buildDateFilterCriteria = (dateFilter, startDate, endDate) => {
  const now = new Date();
  const todayComp = getISTComponents(now);
  const todayUTC = new Date(Date.UTC(todayComp.year, todayComp.month, todayComp.day));

  if (dateFilter === 'today') {
    const startOfToday = makeISTDate(todayComp.year, todayComp.month, todayComp.day, 0, 0, 0, 0);
    const endOfToday = makeISTDate(todayComp.year, todayComp.month, todayComp.day, 23, 59, 59, 999);
    return { $gte: startOfToday, $lte: endOfToday };
  } else if (dateFilter === 'yesterday') {
    const yesterdayUTC = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);
    const yYear = yesterdayUTC.getUTCFullYear();
    const yMonth = yesterdayUTC.getUTCMonth();
    const yDay = yesterdayUTC.getUTCDate();

    const startOfYesterday = makeISTDate(yYear, yMonth, yDay, 0, 0, 0, 0);
    const endOfYesterday = makeISTDate(yYear, yMonth, yDay, 23, 59, 59, 999);
    return { $gte: startOfYesterday, $lte: endOfYesterday };
  } else if (dateFilter === 'last7days') {
    const sixDaysAgoUTC = new Date(todayUTC.getTime() - 6 * 24 * 60 * 60 * 1000);
    const sYear = sixDaysAgoUTC.getUTCFullYear();
    const sMonth = sixDaysAgoUTC.getUTCMonth();
    const sDay = sixDaysAgoUTC.getUTCDate();

    const startOfLast7Days = makeISTDate(sYear, sMonth, sDay, 0, 0, 0, 0);
    const endOfToday = makeISTDate(todayComp.year, todayComp.month, todayComp.day, 23, 59, 59, 999);
    return { $gte: startOfLast7Days, $lte: endOfToday };
  } else if (dateFilter === 'last30days') {
    const twentyNineDaysAgoUTC = new Date(todayUTC.getTime() - 29 * 24 * 60 * 60 * 1000);
    const tYear = twentyNineDaysAgoUTC.getUTCFullYear();
    const tMonth = twentyNineDaysAgoUTC.getUTCMonth();
    const tDay = twentyNineDaysAgoUTC.getUTCDate();

    const startOfLast30Days = makeISTDate(tYear, tMonth, tDay, 0, 0, 0, 0);
    const endOfToday = makeISTDate(todayComp.year, todayComp.month, todayComp.day, 23, 59, 59, 999);
    return { $gte: startOfLast30Days, $lte: endOfToday };
  } else if (dateFilter === 'custom' && (startDate || endDate)) {
    const criteria = {};
    if (startDate) {
      const [sY, sM, sD] = startDate.split('-').map(Number);
      criteria.$gte = makeISTDate(sY, sM - 1, sD, 0, 0, 0, 0);
    }
    if (endDate) {
      const [eY, eM, eD] = endDate.split('-').map(Number);
      criteria.$lte = makeISTDate(eY, eM - 1, eD, 23, 59, 59, 999);
    } else if (startDate) {
      const [sY, sM, sD] = startDate.split('-').map(Number);
      criteria.$lte = makeISTDate(sY, sM - 1, sD, 23, 59, 59, 999);
    }
    return criteria;
  }
  return null;
};

/**
 * Helper to normalize and combine Admission and Appointment documents into unified records
 */
const fetchUnifiedRecords = async (dateFilter, startDate, endDate, searchStr) => {
  const dateCriteria = buildDateFilterCriteria(dateFilter, startDate, endDate);
  
  const query = {};
  if (dateCriteria) {
    query.createdAt = dateCriteria;
  }

  const admissions = await Admission.find(query).sort({ createdAt: -1 }).lean();
  const appointments = await Appointment.find(query).sort({ createdAt: -1 }).lean();

  const formattedAdmissions = admissions.map(item => {
    const isPG = isPGCourse(item.course);
    return {
      _id: item._id,
      tokenNumber: item.tokenNumber || `AIET-${new Date(item.createdAt).getFullYear()}-${isPG ? 'PG' : 'UG'}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      course: item.course || '',
      department: item.department || 'Engineering & Technology',
      desk: item.desk || '',
      appointmentDate: item.admissionDate || (item.createdAt ? getISTDateString(new Date(item.createdAt)) : ''),
      admissionTime: item.admissionTime || (item.createdAt ? getISTTimeString(new Date(item.createdAt)) : ''),
      appointmentType: item.appointmentType || 'Online Seat Booking',
      category: isPG ? 'PG' : 'UG',
      status: item.status || 'Pending',
      remarks: item.remarks || '',
      createdAt: item.createdAt || new Date(),
      source: 'admission',
    };
  });

  const formattedAppointments = appointments.map(item => {
    const isPG = isPGCourse(item.course);
    return {
      _id: item._id,
      tokenNumber: item.token || `AIET-${new Date(item.createdAt).getFullYear()}-${isPG ? 'PG' : 'UG'}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      course: item.course || (isPG ? 'MBA' : 'CSE'),
      department: 'Engineering & Technology',
      desk: item.desk || '',
      appointmentDate: item.date || (item.createdAt ? getISTDateString(new Date(item.createdAt)) : ''),
      admissionTime: item.createdAt ? getISTTimeString(new Date(item.createdAt)) : '',
      appointmentType: item.type === 'online' ? 'Online Video Counselling' : 'Offline Campus Counselling',
      category: isPG ? 'PG' : 'UG',
      status: 'Pending',
      remarks: item.type === 'online' ? 'Remote Session' : 'Campus Check-in',
      createdAt: item.createdAt || new Date(),
      source: 'appointment',
    };
  });

  let combined = [...formattedAdmissions, ...formattedAppointments];

  // Sort by createdAt descending
  combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Apply search filter if provided
  if (searchStr && searchStr.trim()) {
    const s = searchStr.toLowerCase().trim();
    combined = combined.filter(item => 
      item.name.toLowerCase().includes(s) ||
      item.email.toLowerCase().includes(s) ||
      item.phone.toLowerCase().includes(s) ||
      item.course.toLowerCase().includes(s) ||
      item.tokenNumber.toLowerCase().includes(s) ||
      item.desk.toLowerCase().includes(s)
    );
  }

  return combined;
};

/**
 * @desc    Admin Login
 * @route   POST /api/admin/auth/login
 * @access  Public
 */
export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.',
      });
    }

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Current Logged in Admin Profile
 * @route   GET /api/admin/auth/me
 * @access  Private (Admin)
 */
export const getAdminProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

/**
 * @desc    Get Admin Dashboard Statistics & Analytics Charts Data
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const allRecords = await fetchUnifiedRecords(null, null, null, null);

    const now = new Date();
    const todayComp = getISTComponents(now);
    const startOfToday = makeISTDate(todayComp.year, todayComp.month, todayComp.day, 0, 0, 0, 0);
    const endOfToday = makeISTDate(todayComp.year, todayComp.month, todayComp.day, 23, 59, 59, 999);

    const todayRecords = allRecords.filter(r => {
      const d = new Date(r.createdAt);
      return d >= startOfToday && d <= endOfToday;
    });

    const todayUG = todayRecords.filter(r => r.category === 'UG').length;
    const todayPG = todayRecords.filter(r => r.category === 'PG').length;
    const todayAdmissions = todayRecords.length;

    const onlineAppointments = await Appointment.countDocuments({ type: 'online' });
    const offlineAppointments = await Appointment.countDocuments({ type: 'offline' });
    const seatSlotsBooked = await Admission.countDocuments();
    const pendingAdmissions = allRecords.filter(r => r.status === 'Pending').length;
    const confirmedAdmissions = allRecords.filter(r => r.status === 'Confirmed').length;
    const totalAdmissions = allRecords.length;

    // Daily breakdown for last 7 days chart
    const dailyChartData = [];
    const todayUTC = new Date(Date.UTC(todayComp.year, todayComp.month, todayComp.day));

    for (let i = 6; i >= 0; i--) {
      const dUTC = new Date(todayUTC.getTime() - i * 24 * 60 * 60 * 1000);
      const year = dUTC.getUTCFullYear();
      const month = dUTC.getUTCMonth();
      const day = dUTC.getUTCDate();

      const dStart = makeISTDate(year, month, day, 0, 0, 0, 0);
      const dEnd = makeISTDate(year, month, day, 23, 59, 59, 999);

      const dayRecords = allRecords.filter(r => {
        const rDate = new Date(r.createdAt);
        return rDate >= dStart && rDate <= dEnd;
      });

      const ug = dayRecords.filter(r => r.category === 'UG').length;
      const pg = dayRecords.filter(r => r.category === 'PG').length;

      const sampleDate = makeISTDate(year, month, day, 12, 0, 0, 0);
      dailyChartData.push({
        dayLabel: sampleDate.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' }),
        ug,
        pg,
        total: ug + pg,
      });
    }

    // Monthly breakdown for last 6 months chart
    const monthlyChartData = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthRecords = allRecords.filter(r => {
        const rDate = new Date(r.createdAt);
        return rDate >= mStart && rDate <= mEnd;
      });

      const ug = monthRecords.filter(r => r.category === 'UG').length;
      const pg = monthRecords.filter(r => r.category === 'PG').length;

      monthlyChartData.push({
        monthLabel: m.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        ug,
        pg,
        total: ug + pg,
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        todayAdmissions,
        todayUG,
        todayPG,
        onlineAppointments,
        offlineAppointments,
        seatSlotsBooked,
        pendingAdmissions,
        confirmedAdmissions,
        totalAdmissions,
      },
      charts: {
        daily: dailyChartData,
        monthly: monthlyChartData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get UG Admissions Reports
 * @route   GET /api/admin/reports/ug
 * @access  Private (Admin)
 */
export const getUGReports = async (req, res, next) => {
  try {
    const { search, dateFilter, startDate, endDate, page = 1, limit = 50 } = req.query;

    const allRecords = await fetchUnifiedRecords(dateFilter, startDate, endDate, search);
    const ugRecords = allRecords.filter(r => r.category === 'UG');

    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 50;
    const skip = (p - 1) * l;
    const paginatedRecords = ugRecords.slice(skip, skip + l);

    res.status(200).json({
      success: true,
      count: paginatedRecords.length,
      total: ugRecords.length,
      page: p,
      pages: Math.ceil(ugRecords.length / l) || 1,
      data: paginatedRecords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get PG Admissions Reports
 * @route   GET /api/admin/reports/pg
 * @access  Private (Admin)
 */
export const getPGReports = async (req, res, next) => {
  try {
    const { search, dateFilter, startDate, endDate, page = 1, limit = 50 } = req.query;

    const allRecords = await fetchUnifiedRecords(dateFilter, startDate, endDate, search);
    const pgRecords = allRecords.filter(r => r.category === 'PG');

    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 50;
    const skip = (p - 1) * l;
    const paginatedRecords = pgRecords.slice(skip, skip + l);

    res.status(200).json({
      success: true,
      count: paginatedRecords.length,
      total: pgRecords.length,
      page: p,
      pages: Math.ceil(pgRecords.length / l) || 1,
      data: paginatedRecords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download UG Excel file
 * @route   GET /api/admin/reports/download/ug
 * @access  Private (Admin)
 */
export const downloadUGExcel = async (req, res, next) => {
  try {
    const { search, dateFilter, startDate, endDate } = req.query;
    const allRecords = await fetchUnifiedRecords(dateFilter, startDate, endDate, search);
    const ugRecords = allRecords.filter(r => r.category === 'UG');

    const buffer = await generateFilteredExcelBuffer(ugRecords, 'UG Admissions Report');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="UG_Admissions.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download PG Excel file
 * @route   GET /api/admin/reports/download/pg
 * @access  Private (Admin)
 */
export const downloadPGExcel = async (req, res, next) => {
  try {
    const { search, dateFilter, startDate, endDate } = req.query;
    const allRecords = await fetchUnifiedRecords(dateFilter, startDate, endDate, search);
    const pgRecords = allRecords.filter(r => r.category === 'PG');

    const buffer = await generateFilteredExcelBuffer(pgRecords, 'PG Admissions Report');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="PG_Admissions.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Filter Reports across UG and PG dynamically
 * @route   GET /api/admin/reports/filter
 * @access  Private (Admin)
 */
export const getFilteredReports = async (req, res, next) => {
  try {
    const { search, dateFilter, startDate, endDate, category } = req.query;

    let records = await fetchUnifiedRecords(dateFilter, startDate, endDate, search);
    if (category && (category === 'UG' || category === 'PG')) {
      records = records.filter(r => r.category === category);
    }

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};
