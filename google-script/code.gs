/**
 * Google Apps Script for Hoàng Gia Education System
 * Đã cấu hình phân luồng dữ liệu chuẩn xác từng Sheet.
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

  // ---------------------------------------------------------
  // LUỒNG ĐĂNG NHẬP
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // LUỒNG LẤY TẤT CẢ DỮ LIỆU
  // ---------------------------------------------------------
  var result = {
    subjects: [],
    program: {},
    accounts: []
  };
  
  // 1. Đọc Danh_muc_mon
  var subjectSheet = ss.getSheetByName("Danh_muc_mon");
  if (subjectSheet) {
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
  }
  
  // 2. Đọc các sheet PPCT (6, 7, 8, 9)
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

  // 3. Đọc Accounts
  var accountSheet2 = ss.getSheetByName("Accounts");
  if (accountSheet2) {
    var accountData2 = accountSheet2.getDataRange().getValues();
    var headers2 = accountData2[0].map(function(h) { return h.toString().toLowerCase(); });
    for (var k = 1; k < accountData2.length; k++) {
      var row2 = accountData2[k];
      var acc2 = { id: k.toString(), index: k };
      headers2.forEach(function(h, j) {
        var val = row2[j];
        if (h.includes("tài khoản") || h.includes("username")) acc2.username = val ? val.toString() : "";
        if (h.includes("mật khẩu") || h.includes("password")) acc2.password = val ? val.toString() : "";
        if (h.includes("quyền") || h.includes("role")) acc2.role = val ? val.toString() : "";
        if (h.includes("thời hạn") || h.includes("expiry")) acc2.expiry = val ? val.toString() : "";
        if (h.includes("số máy") || h.includes("devices")) acc2.maxDevices = parseInt(val) || 1;
      });
      if (acc2.username) result.accounts.push(acc2);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ---------------------------------------------------------
// LUỒNG LƯU DỮ LIỆU TỪ ỨNG DỤNG LÊN GOOGLE SHEETS
// ---------------------------------------------------------
function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var ss = getSS();
    
    // ==========================================
    // 1. CẤU HÌNH TÀI KHOẢN VÀO SHEET "Accounts"
    // ==========================================
    if (contents.accounts !== undefined) {
      var accountSheet = ss.getSheetByName("Accounts");
      if (!accountSheet) accountSheet = ss.insertSheet("Accounts");
      
      accountSheet.clear(); 
      accountSheet.appendRow(["Tài khoản", "Mật khẩu", "Quyền", "Thời hạn", "Số máy"]);
      
      if (contents.accounts.length > 0) {
        var accRows = contents.accounts.map(function(acc) {
          return [acc.username, acc.password, acc.role, acc.expiry, acc.maxDevices || 1];
        });
        accountSheet.getRange(2, 1, accRows.length, 5).setValues(accRows);
      }
    }

    // ==========================================
    // 2. CẤU HÌNH MÔN/PHÂN MÔN VÀO SHEET "Danh_muc_mon"
    // ==========================================
    if (contents.subjects !== undefined) {
      var subjectSheet = ss.getSheetByName("Danh_muc_mon");
      if (!subjectSheet) subjectSheet = ss.insertSheet("Danh_muc_mon");
      
      subjectSheet.clear(); 
      subjectSheet.appendRow(["Khối", "Môn", "Phân môn"]);
      
      if (contents.subjects.length > 0) {
        var subjectRows = contents.subjects.map(function(s) {
          return [s.grade, s.subject, s.subSubject];
        });
        subjectSheet.getRange(2, 1, subjectRows.length, 3).setValues(subjectRows);
      }
    }
    
    // ==========================================
    // 3. CẤU HÌNH PPCT VÀO CÁC SHEET TƯƠNG ỨNG (PPCT_6, 7, 8, 9)
    // ==========================================
    if (contents.program !== undefined) {
      var ppctData = contents.program;
      
      // Khởi tạo khay chứa dữ liệu cho 4 khối riêng biệt
      var gradeData = { "6": [], "7": [], "8": [], "9": [] };
      
      // Phân loại dữ liệu dựa theo Key (Key format: Khối-Môn-PhânMôn-Tiết)
      for (var keyData in ppctData) {
        var parts = keyData.split("-"); // Ví dụ: 6-Toán-Đại số-1
        if (parts.length >= 4) {
          var g = parts[0]; // Lấy ra Khối (6, 7, 8 hoặc 9)
          if (gradeData[g] !== undefined) { // Đảm bảo đúng khối mới đưa vào
            gradeData[g].push([parts[1], parts[2], parts[3], ppctData[keyData]]);
          }
        }
      }
      
      // Kiểm tra xem frontend có yêu cầu chỉ update một số khối nhất định không
      // Nếu không gửi targetGrades, sẽ mặc định update cả 4 khối 6, 7, 8, 9
      var targetGrades = contents.targetGrades || ["6", "7", "8", "9"];
      
      // Cập nhật từng sheet theo từng khối đã được phân loại
      for (var idx = 0; idx < targetGrades.length; idx++) {
        var targetG = targetGrades[idx]; // VD: "6"
        
        // Bỏ qua nếu giá trị khối không hợp lệ
        if (!gradeData[targetG]) continue; 

        var sheetName = "PPCT_" + targetG;
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) sheet = ss.insertSheet(sheetName);
        
        sheet.clear();
        sheet.appendRow(["Môn", "Phân môn", "Tiết", "Nội dung"]);
        
        if (gradeData[targetG].length > 0) {
          // Sắp xếp tự động cho đẹp mắt: Theo Môn -> Theo Tiết
          gradeData[targetG].sort(function(a, b) {
            if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
            return parseInt(a[2]) - parseInt(b[2]);
          });
          
          sheet.getRange(2, 1, gradeData[targetG].length, 4).setValues(gradeData[targetG]);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đã phân bổ dữ liệu chính xác 100% vào các sheet!" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
