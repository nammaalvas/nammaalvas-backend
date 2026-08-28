import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for excel storage (project_root/excel)
const EXCEL_BASE_DIR = path.resolve(__dirname, '..', 'excel');

const PG_COURSES = ['MBA', 'MCA', 'M.TECH', 'M.E.', 'PG'];

/**
 * Helper to check if a course belongs to PG
 */
export const isPGCourse = (courseName = '') => {
  if (!courseName) return false;
  const upper = courseName.toUpperCase().trim();
  return PG_COURSES.some((pg) => upper.includes(pg));
};

/**
 * Creates monthly directory path e.g., /excel/2026/July
 */
const getMonthlyExcelDir = (dateObj = new Date()) => {
  const year = dateObj.getFullYear().toString();
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
  const dirPath = path.join(EXCEL_BASE_DIR, year, monthName);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

/**
 * Helper to get path for UG or PG Excel file
 */
export const getExcelFilePath = (isPG = false, dateObj = new Date()) => {
  const dirPath = getMonthlyExcelDir(dateObj);
  const fileName = isPG ? 'PG_Admissions.xlsx' : 'UG_Admissions.xlsx';
  return path.join(dirPath, fileName);
};

/**
 * Helper to apply styling to header row
 */
const styleHeaderRow = (worksheet) => {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF800000' }, // Dark Maroon header
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  worksheet.columns.forEach((col) => {
    col.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });
};

/**
 * Append Admission Record (UG / PG)
 */
export const appendAdmissionRecord = async (data, isPG = false) => {
  const dateObj = data.createdAt ? new Date(data.createdAt) : new Date();
  const dirPath = getMonthlyExcelDir(dateObj);
  const fileName = isPG ? 'PG_Admissions.xlsx' : 'UG_Admissions.xlsx';
  const filePath = path.join(dirPath, fileName);
  const sheetName = isPG ? 'PG Admissions' : 'UG Admissions';

  const columns = [
    { header: 'Token Number', key: 'tokenNumber', width: 22 },
    { header: 'Applicant Full Name', key: 'name', width: 26 },
    { header: 'Email Address', key: 'email', width: 28 },
    { header: 'Contact Number', key: 'phone', width: 18 },
    { header: 'Program / Branch', key: 'course', width: 24 },
    { header: 'Selected Desk', key: 'desk', width: 22 },
    { header: 'Appointment Date', key: 'appointmentDate', width: 20 },
    { header: 'Appointment Type', key: 'appointmentType', width: 28 },
    { header: 'Admission Category', key: 'category', width: 20 },
    { header: 'Created Date', key: 'createdDate', width: 16 },
    { header: 'Created Time', key: 'createdTime', width: 16 },
  ];

  let workbook = new ExcelJS.Workbook();
  if (fs.existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath);
  } else {
    workbook.creator = 'AIET-Verse Backend';
    workbook.created = dateObj;
  }

  let worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = columns;
    styleHeaderRow(worksheet);
  }

  const createdDate = dateObj.toISOString().split('T')[0];
  const createdTime = dateObj.toTimeString().split(' ')[0];

  const rowData = {
    tokenNumber: data.token || data.tokenNumber || `AIET-${dateObj.getFullYear()}-${isPG ? 'PG' : 'UG'}-${Math.floor(1000 + Math.random() * 9000)}`,
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    course: data.course || '',
    desk: data.desk || '',
    appointmentDate: data.date || data.appointmentDate || '',
    appointmentType: data.appointmentType || (data.type ? (data.type === 'online' ? 'Online Video Counselling' : 'Offline Campus Counselling') : 'Online Seat Booking'),
    category: isPG ? 'PG' : 'UG',
    createdDate,
    createdTime,
  };

  const addedRow = worksheet.addRow(rowData);
  addedRow.height = 20;
  addedRow.font = { size: 10 };

  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ [EXCEL UPDATED SUCCESS] Written record ${rowData.tokenNumber} to ${filePath}`);
  return filePath;
};

export const appendUGAdmission = async (data) => {
  return await appendAdmissionRecord(data, false);
};

export const appendPGAdmission = async (data) => {
  return await appendAdmissionRecord(data, true);
};

/**
 * Append Contact Enquiry Record
 */
export const appendContactEnquiry = async (data) => {
  const dateObj = data.createdAt ? new Date(data.createdAt) : new Date();
  const dirPath = getMonthlyExcelDir(dateObj);
  const filePath = path.join(dirPath, 'Contact_Enquiries.xlsx');
  const sheetName = 'Contact Enquiries';

  const columns = [
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Message', key: 'message', width: 45 },
    { header: 'Created Date', key: 'createdDate', width: 16 },
    { header: 'Created Time', key: 'createdTime', width: 16 },
  ];

  let workbook = new ExcelJS.Workbook();
  if (fs.existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath);
  } else {
    workbook.creator = 'AIET-Verse Backend';
    workbook.created = dateObj;
  }

  let worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = columns;
    styleHeaderRow(worksheet);
  }

  const createdDate = dateObj.toISOString().split('T')[0];
  const createdTime = dateObj.toTimeString().split(' ')[0];

  const rowData = {
    name: data.name || '',
    email: data.email || '',
    message: data.message || '',
    createdDate,
    createdTime,
  };

  const addedRow = worksheet.addRow(rowData);
  addedRow.height = 20;
  addedRow.font = { size: 10 };

  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ [EXCEL UPDATED SUCCESS] Written contact enquiry from ${rowData.email} to ${filePath}`);
  return filePath;
};

/**
 * Generates buffer for admin report downloads
 */
export const generateFilteredExcelBuffer = async (records = [], reportTitle = 'Filtered Report') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AIET-Verse Backend';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Report');
  worksheet.columns = [
    { header: 'Token Number', key: 'tokenNumber', width: 22 },
    { header: 'Applicant Full Name', key: 'name', width: 26 },
    { header: 'Email Address', key: 'email', width: 28 },
    { header: 'Contact Number', key: 'phone', width: 18 },
    { header: 'Program / Branch', key: 'course', width: 24 },
    { header: 'Selected Desk', key: 'desk', width: 22 },
    { header: 'Appointment Date', key: 'appointmentDate', width: 20 },
    { header: 'Appointment Type', key: 'appointmentType', width: 28 },
    { header: 'Admission Category', key: 'category', width: 20 },
    { header: 'Created Date', key: 'createdDate', width: 16 },
    { header: 'Created Time', key: 'createdTime', width: 16 },
  ];
  styleHeaderRow(worksheet);

  records.forEach((data) => {
    const dateObj = data.createdAt ? new Date(data.createdAt) : new Date();
    worksheet.addRow({
      tokenNumber: data.token || data.tokenNumber || '',
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      course: data.course || '',
      desk: data.desk || '',
      appointmentDate: data.date || data.appointmentDate || '',
      appointmentType: data.appointmentType || data.type || '',
      category: data.category || 'UG',
      createdDate: dateObj.toISOString().split('T')[0],
      createdTime: dateObj.toTimeString().split(' ')[0],
    });
  });

  return await workbook.xlsx.writeBuffer();
};
