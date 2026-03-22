/**
 * Google Apps Script for connecting React App to Google Sheets
 * This script handles initialization of sheets and provides a read-only endpoint.
 */

const SPREADSHEET_ID = "1g6Bgw96E9eVCbG3jQQ0nS7HGRqpuSy-UusR3kdvU8RQ";

function doGet(e) {
  // Check if e is defined (prevents error when running manually in Apps Script editor)
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("Script is running correctly. Please access it via the Web App URL from the React application.").setMimeType(ContentService.MimeType.TEXT);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const action = e.parameter.action;

  // Initialize sheets if they don't exist
  initializeSheets(ss);

  if (action === 'login') {
    return handleLogin(ss, e.parameter.username, e.parameter.password);
  }

  // Default action: Fetch all data
  return fetchData(ss);
}

function doPost(e) {
  // Read-only mode: Disable saving from system to sheets
  return ContentService.createTextOutput(JSON.stringify({ 
    success: false, 
    message: "Hệ thống đang ở chế độ CHỈ ĐỌC. Vui lòng chỉnh sửa trực tiếp trên Google Sheets." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function initializeSheets(ss) {
  const sheets = [
    { name: "Tài khoản đăng nhập", headers: ["ID", "Username", "Password", "Role", "Expiry", "MaxDevices"] },
    { name: "Cấu hình", headers: ["Grade", "Subject", "SubSubject"] },
    { name: "PPCT Khối 6", headers: ["ID", "Day", "Shift", "Class", "Subject", "SubSubject", "Period", "Content", "Teacher", "Note"] },
    { name: "PPCT Khối 7", headers: ["ID", "Day", "Shift", "Class", "Subject", "SubSubject", "Period", "Content", "Teacher", "Note"] },
    { name: "PPCT Khối 8", headers: ["ID", "Day", "Shift", "Class", "Subject", "SubSubject", "Period", "Content", "Teacher", "Note"] },
    { name: "PPCT Khối 9", headers: ["ID", "Day", "Shift", "Class", "Subject", "SubSubject", "Period", "Content", "Teacher", "Note"] }
  ];

  sheets.forEach(s => {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.getRange(1, 1, 1, s.headers.length).setValues([s.headers]).setFontWeight("bold").setBackground("#f3f3f3");
      
      // Add a default admin account if it's the account sheet
      if (s.name === "Tài khoản đăng nhập") {
        sheet.appendRow(["admin-01", "admin", "123456", "Quản trị viên", "", "999"]);
      }
    }
  });
}

function fetchData(ss) {
  const data = {
    accounts: getSheetData(ss, "Tài khoản đăng nhập"),
    subjects: getSheetData(ss, "Cấu hình"),
    program: {
      "6": getSheetData(ss, "PPCT Khối 6"),
      "7": getSheetData(ss, "PPCT Khối 7"),
      "8": getSheetData(ss, "PPCT Khối 8"),
      "9": getSheetData(ss, "PPCT Khối 9")
    }
  };

  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const rows = values.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      // Map headers to keys used in the React app
      let key = header.toLowerCase();
      if (key === 'subsubject') key = 'subSubject';
      if (key === 'parentname') key = 'parentName';
      if (key === 'registrationdate') key = 'registrationDate';
      if (key === 'maxdevices') key = 'maxDevices';
      
      obj[key] = row[i];
    });
    return obj;
  });
}

function handleLogin(ss, username, password) {
  const accounts = getSheetData(ss, "Tài khoản đăng nhập");
  const user = accounts.find(u => String(u.username) === String(username) && String(u.password) === String(password));
  
  if (user) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, user: user })).setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Sai tài khoản hoặc mật khẩu" })).setMimeType(ContentService.MimeType.JSON);
  }
}
