/**
 * Google Apps Script for Hoàng Gia Education System
 * 
 * Instructions:
 * 1. Open a Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into the editor.
 * 4. Click "Deploy" > "New Deployment".
 * 5. Select type "Web App".
 * 6. Set "Execute as" to "Me".
 * 7. Set "Who has access" to "Anyone".
 * 8. Copy the Web App URL and paste it into the "Google Script URL" field in the app configuration.
 */

const SPREADSHEET_ID = "1fPhe6RHb7Y4USs4dyv7NJUZqRQulq__Y7Edgcr_69CI";

function getSS() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function doGet(e) {
  var ss = getSS();

  // Handle Login Action
  if (e.parameter.action === "login") {
    var username = e.parameter.username;
    var password = e.parameter.password;
    var user = null;
    
    var accountSheet = ss.getSheetByName("Accounts");
    if (accountSheet) {
      var accountData = accountSheet.getDataRange().getValues();
      var headers = accountData[0].map(function(h) { return h.toString().toLowerCase(); });
      for (var i = 1; i < accountData.length; i++) {
        var row = accountData[i];
        var acc = { id: i.toString(), index: i };
        headers.forEach(function(h, j) {
          var val = row[j];
          if (h.includes("tài khoản") || h.includes("username")) acc.username = val ? val.toString() : "";
          if (h.includes("mật khẩu") || h.includes("password")) acc.password = val ? val.toString() : "";
          if (h.includes("quyền") || h.includes("role")) acc.role = val ? val.toString() : "";
          if (h.includes("thời hạn") || h.includes("expiry")) acc.expiry = val ? val.toString() : "";
          if (h.includes("số máy") || h.includes("devices")) acc.maxDevices = parseInt(val) || 1;
        });
        
        if (acc.username === username && acc.password === password) {
          user = acc;
          break;
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: !!user, user: user }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var result = {
    subjects: [],
    program: {},
    accounts: []
  };
  
  // 1. Read Subjects (Sheet 1)
  var subjectSheet = ss.getSheetByName("Danh_muc_mon") || ss.getSheets()[0];
  var subjectData = subjectSheet.getDataRange().getValues();
  for (var i = 1; i < subjectData.length; i++) {
    var grade = subjectData[i][0];
    var subject = subjectData[i][1];
    var subSubject = subjectData[i][2];
    if (grade && subject) {
      result.subjects.push({
        grade: grade.toString(),
        subject: subject.toString(),
        subSubject: (subSubject || "").toString()
      });
    }
  }
  
  // 2. Read PPCT sheets (Grade 6 to 9)
  var ppctSheets = ["PPCT_6", "PPCT_7", "PPCT_8", "PPCT_9"];
  ppctSheets.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var grade = sheetName.split("_")[1];
      for (var i = 1; i < data.length; i++) {
        var subject = data[i][0];
        var subSubject = data[i][1];
        var period = data[i][2];
        var content = data[i][3];
        
        if (subject && period) {
          var key = grade + "-" + subject + "-" + (subSubject || "") + "-" + period;
          result.program[key] = content.toString();
        }
      }
    }
  });

  // 3. Read Accounts
  var accountSheet = ss.getSheetByName("Accounts");
  if (accountSheet) {
    var accountData = accountSheet.getDataRange().getValues();
    var headers = accountData[0].map(function(h) { return h.toString().toLowerCase(); });
    for (var i = 1; i < accountData.length; i++) {
      var row = accountData[i];
      var acc = { id: i.toString(), index: i };
      headers.forEach(function(h, j) {
        var val = row[j];
        if (h.includes("tài khoản") || h.includes("username")) acc.username = val ? val.toString() : "";
        if (h.includes("mật khẩu") || h.includes("password")) acc.password = val ? val.toString() : "";
        if (h.includes("quyền") || h.includes("role")) acc.role = val ? val.toString() : "";
        if (h.includes("thời hạn") || h.includes("expiry")) acc.expiry = val ? val.toString() : "";
        if (h.includes("số máy") || h.includes("devices")) acc.maxDevices = parseInt(val) || 1;
      });
      if (acc.username) result.accounts.push(acc);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var ss = getSS();
    
    // 1. Update Subjects
    var subjectSheet = ss.getSheetByName("Danh_muc_mon");
    if (!subjectSheet) {
      subjectSheet = ss.insertSheet("Danh_muc_mon");
    }
    subjectSheet.clear();
    subjectSheet.appendRow(["Khối", "Môn", "Phân môn"]);
    if (contents.subjects && contents.subjects.length > 0) {
      var subjectRows = contents.subjects.map(function(s) {
        return [s.grade, s.subject, s.subSubject];
      });
      subjectSheet.getRange(2, 1, subjectRows.length, 3).setValues(subjectRows);
    }
    
    // 2. Update PPCT sheets
    var ppctData = contents.program || {};
    var gradeData = { "6": [], "7": [], "8": [], "9": [] };
    
    for (var key in ppctData) {
      var parts = key.split("-");
      if (parts.length >= 4) {
        var grade = parts[0];
        if (gradeData[grade]) {
          gradeData[grade].push([parts[1], parts[2], parts[3], ppctData[key]]);
        }
      }
    }
    
    for (var grade in gradeData) {
      var sheetName = "PPCT_" + grade;
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
      sheet.clear();
      sheet.appendRow(["Môn", "Phân môn", "Tiết", "Nội dung"]);
      if (gradeData[grade].length > 0) {
        // Sort by subject then period
        gradeData[grade].sort(function(a, b) {
          if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
          return parseInt(a[2]) - parseInt(b[2]);
        });
        
        sheet.getRange(2, 1, gradeData[grade].length, 4).setValues(gradeData[grade]);
      }
    }

    // 3. Update Accounts
    if (contents.accounts) {
      var accountSheet = ss.getSheetByName("Accounts");
      if (!accountSheet) {
        accountSheet = ss.insertSheet("Accounts");
      }
      accountSheet.clear();
      accountSheet.appendRow(["Thứ tự", "Tài khoản", "Mật khẩu", "Quyền", "Thời hạn", "Số máy"]);
      if (contents.accounts.length > 0) {
        var accountRows = contents.accounts.map(function(acc, idx) {
          return [idx + 1, acc.username, acc.password, acc.role, acc.expiry, acc.maxDevices];
        });
        accountSheet.getRange(2, 1, accountRows.length, 6).setValues(accountRows);
      }
    }
    
    return ContentService.createTextOutput("Success")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}
