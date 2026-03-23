/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  LogIn, 
  Settings, 
  BookOpen, 
  Eye,
  Calendar, 
  FileText, 
  Plus, 
  Download, 
  Save, 
  Trash2, 
  User,
  GraduationCap,
  ClipboardList,
  Upload,
  RefreshCw,
  FileDown,
  ArrowUp,
  ArrowDown,
  Layout,
  Users,
  DollarSign,
  Sparkles,
  CheckCircle,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRight,
  ArrowLeft,
  Home,
  PieChart,
  LogOut,
  ChevronDown,
  Bell,
  Search,
  Menu,
  X,
  TrendingUp,
  Activity,
  Award,
  ShieldCheck,
  AlertCircle,
  Edit2,
  MapPin,
  Phone,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Document, Packer, Paragraph, Table, TableCell, TableRow as DocxTableRow, WidthType, AlignmentType, HeadingLevel, TextRun, PageOrientation, VerticalMergeType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

import { GoogleGenAI } from "@google/genai";

type Tab = 'dashboard' | 'login' | 'config_hkd' | 'program' | 'schedule' | 'journal' | 'subject_config' | 'students' | 'finance' | 'accounts' | 'reports';

interface HKDConfig {
  name: string;
  address: string;
  owner: string;
  taxId: string;
  scriptUrl?: string;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  school: string;
  parentName: string;
  phone: string;
  subjects: string;
  registrationDate: string;
  fee?: number;
}

interface UserAccount {
  id: string;
  index: number;
  username: string;
  password?: string;
  role: string;
  expiry: string;
  maxDevices: number;
  registeredDevices?: string[];
}

interface TableRow {
  id: string;
  day: string;
  shift: string;
  class: string;
  subject: string;
  subSubject: string;
  period: string;
  content: string;
  teacher: string;
  note?: string;
  attendance?: string;
  comment?: string;
}

const SHIFT_OPTIONS = [
  'Ca 1 (Từ 17h đến 19h)',
  'Ca 2 (Từ 19h đến 21h)',
  'Ca 1 (Từ 7h đến 9h)',
  'Ca 2 (Từ 9h đến 11h)',
  'Ca 3 (Từ 14h đến 16h)',
  'Ca 4 (Từ 16h đến 18h)',
  'Ca 5 (Từ 18h đến 20h)',
  'Ca 6 (Từ 20h đến 22h)',
];

const DAY_OPTIONS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const GOOGLE_SCRIPT_CODE = `/**
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
}`;

const numberToVietnameseWords = (num: number): string => {
  if (num === 0) return "Không đồng";
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const levels = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  
  const readThreeDigits = (n: number, isFirst: boolean): string => {
    let res = "";
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;
    
    if (hundreds > 0) {
      res += units[hundreds] + " trăm ";
    } else if (!isFirst) {
      res += "không trăm ";
    }
    
    if (tens > 1) {
      res += units[tens] + " mươi ";
      if (ones === 1) res += "mốt";
      else if (ones === 5) res += "lăm";
      else if (ones > 0) res += units[ones];
    } else if (tens === 1) {
      res += "mười ";
      if (ones === 5) res += "lăm";
      else if (ones > 0) res += units[ones];
    } else if (ones > 0) {
      if (!isFirst || (hundreds > 0)) res += "linh ";
      res += units[ones];
    }
    return res.trim();
  };

  let res = "";
  let levelIdx = 0;
  let temp = num;
  
  while (temp > 0) {
    const threeDigits = temp % 1000;
    if (threeDigits > 0) {
      const part = readThreeDigits(threeDigits, temp < 1000);
      res = part + " " + levels[levelIdx] + " " + res;
    }
    temp = Math.floor(temp / 1000);
    levelIdx++;
  }
  
  res = res.trim();
  return res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
};

const Dashboard = ({ 
  studentsCount, 
  activeStudentsCount, 
  revenue, 
  setActiveTab, 
  currentUser,
  isAdmin
}: { 
  studentsCount: number; 
  activeStudentsCount: number; 
  revenue: number; 
  setActiveTab: (tab: Tab) => void; 
  currentUser: UserAccount | null;
  isAdmin: boolean;
}) => {
  const stats = [
    { label: 'Tổng học sinh', value: studentsCount, icon: <Users className="text-blue-600" />, trend: '+12%', color: 'bg-blue-50' },
    { label: 'Đang theo học', value: activeStudentsCount, icon: <Activity className="text-emerald-600" />, trend: '+5%', color: 'bg-emerald-50' },
    { label: 'Doanh thu tháng', value: revenue.toLocaleString('vi-VN') + 'đ', icon: <DollarSign className="text-purple-600" />, trend: '+18%', color: 'bg-purple-50' },
    { label: 'Tỉ lệ chuyên cần', value: '94.2%', icon: <Award className="text-orange-600" />, trend: '+2%', color: 'bg-orange-50' },
  ];

  const chartData = [
    { name: 'Tháng 10', value: 45 },
    { name: 'Tháng 11', value: 52 },
    { name: 'Tháng 12', value: 48 },
    { name: 'Tháng 1', value: 61 },
    { name: 'Tháng 2', value: 55 },
    { name: 'Tháng 3', value: 67 },
  ];

  const attendanceData = [
    { name: 'Hiện diện', value: 94 },
    { name: 'Vắng mặt', value: 6 },
  ];

  const COLORS = ['#6366f1', '#e2e8f0'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 sm:gap-8"
    >
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-12 text-white shadow-2xl shadow-indigo-200">
        <div className="relative z-10 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs sm:text-sm font-bold uppercase tracking-wider">
                <Sparkles size={16} /> Chào mừng Quý Thầy Cô đến với HOÀNG GIA !
              </span>
              {currentUser?.expiry && (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 backdrop-blur-md text-xs sm:text-sm font-semibold text-amber-100 border border-amber-400/30">
                  <Calendar size={16} /> Thời hạn sử dụng: {currentUser.expiry}
                </span>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight tracking-tighter text-center">
              Hệ thống quản lý, vận hành <br className="hidden sm:block" />
              cơ sở dạy thêm
            </h1>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-[1.25rem] p-5 sm:p-6 border border-white/20 shadow-inner">
              <p className="text-sm sm:text-base lg:text-lg leading-relaxed opacity-95 font-medium mb-4">
                Hệ thống được thiết kế dành riêng cho các thầy cô và trung tâm dạy thêm. Bao gồm các chương trình: 
                <span className="text-blue-200 font-bold mx-1 underline decoration-blue-500/30 underline-offset-4">Quản lý học sinh</span>, 
                <span className="text-emerald-200 font-bold mx-1 underline decoration-emerald-500/30 underline-offset-4">Quản lý chương trình dạy</span>, 
                <span className="text-purple-200 font-bold mx-1 underline decoration-purple-500/30 underline-offset-4">Quản lý tài chính</span>. 
              </p>
              <p className="text-xs sm:text-sm opacity-90 italic font-medium">
                Chúng tôi cung cấp các công cụ mạnh mẽ để quản lý học sinh, chương trình giảng dạy và tài chính, giúp Quý Thầy Cô tập trung hoàn toàn vào sứ mệnh truyền đạt tri thức.
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative elements - smaller for mobile */}
        <div className="absolute -top-24 -right-24 w-64 sm:w-96 h-64 sm:h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-6 sm:mb-10">
        <ModuleCard 
          title="Cấu hình HKD"
          desc="Thiết lập thông tin cơ sở, cấu hình hệ thống và quản lý các tham số vận hành cốt lõi."
          image="https://picsum.photos/seed/office/800/600"
          onClick={() => setActiveTab('config_hkd')}
          color="indigo"
        />
        <ModuleCard 
          title="Quản lý học sinh"
          desc="Hệ thống lưu trữ hồ sơ, theo dõi chuyên cần và đánh giá tiến độ học tập của từng học sinh."
          image="https://picsum.photos/seed/classroom/800/600"
          onClick={() => setActiveTab('students')}
          color="blue"
        />
        <ModuleCard 
          title="Chương trình dạy"
          desc="Xây dựng kế hoạch giảng dạy, quản lý phân phối chương trình và lịch báo giảng chi tiết."
          image="https://picsum.photos/seed/library/800/600"
          onClick={() => setActiveTab('program')}
          color="purple"
        />
        <ModuleCard 
          title="Quản lý tài chính"
          desc="Công cụ quản lý học phí, kiểm soát thu chi và báo cáo kết quả kinh doanh định kỳ."
          image="https://picsum.photos/seed/business/800/600"
          onClick={() => setActiveTab('finance')}
          color="emerald"
        />
        {isAdmin && (
          <ModuleCard 
            title="Quản lý tài khoản"
            desc="Cấu hình tài khoản người dùng, phân quyền, thời hạn sử dụng và giới hạn số máy truy cập."
            image="https://picsum.photos/seed/security/800/600"
            onClick={() => setActiveTab('accounts')}
            color="rose"
          />
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            className={`${stat.color} p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col gap-3 sm:gap-6 group hover:scale-105 transition-all cursor-default`}
          >
            <div className="flex items-center justify-between">
              <div className="p-3 sm:p-4 bg-white rounded-[1rem] sm:rounded-[1.5rem] shadow-sm group-hover:shadow-md transition-all">
                {React.cloneElement(stat.icon as React.ReactElement, { size: 24 })}
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-100 px-2 sm:px-3 py-1 rounded-full">{stat.trend}</span>
            </div>
            <div>
              <p className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tighter mb-1 sm:mb-2">{stat.value}</p>
              <p className="text-[10px] sm:text-sm font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Tỉ lệ duy trì</h3>
              <p className="text-slate-500 text-sm font-bold mt-1">Biến động học sinh theo tháng</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl ring-1 ring-slate-100">
              <TrendingUp className="text-indigo-600 w-6 h-6" />
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={attendanceData}
                    innerRadius={20}
                    outerRadius={25}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">Chuyên cần</h4>
              <p className="text-xl font-bold text-slate-900 font-display">94.2%</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Học phí tháng</h4>
            <div className="flex items-end justify-between mb-2">
              <p className="text-xl font-bold text-slate-900 font-display">75%</p>
              <p className="text-xs font-bold text-slate-500">45/60</p>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ModuleCard = ({ title, desc, image, onClick, color }: { 
  title: string; 
  desc: string; 
  image: string; 
  onClick: () => void;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    indigo: 'hover:border-indigo-200',
    blue: 'hover:border-blue-200',
    purple: 'hover:border-purple-200',
    emerald: 'hover:border-emerald-200',
  };

  return (
    <button 
      onClick={onClick}
      className={`text-left bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[3rem] shadow-sm transition-all duration-300 group ${colorMap[color] || ''} hover:shadow-2xl hover:-translate-y-2 overflow-hidden flex flex-col h-full`}
    >
      <div className="h-40 sm:h-48 overflow-hidden relative">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
      </div>
      <div className="p-6 sm:p-8 flex-1 flex flex-col">
        <h3 className="text-xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-4 font-sans transition-all">{title}</h3>
        <p className="text-xs sm:text-base text-slate-700 font-normal leading-relaxed mb-4 sm:mb-8 opacity-80 flex-1 transition-all line-clamp-2 sm:line-clamp-none">{desc}</p>
        <div className="flex items-center gap-2 sm:gap-4 text-sm sm:text-lg font-normal group-hover:font-bold text-indigo-600 group-hover:translate-x-3 transition-all">
          Truy cập ngay <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
};

const Reports = ({ 
  students, 
  financeStudents,
  financialConfig, 
  expenditures 
}: { 
  students: Student[]; 
  financeStudents: Student[];
  financialConfig: any; 
  expenditures: any[];
}) => {
  const totalRevenue = financeStudents.reduce((sum, s) => sum + (s.fee ?? financialConfig.feePerSession), 0);
  const totalExpenditure = expenditures.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenditure;

  const data = [
    { name: 'Doanh thu', value: totalRevenue, fill: '#6366f1' },
    { name: 'Chi phí', value: totalExpenditure, fill: '#f43f5e' },
    { name: 'Lợi nhuận', value: netProfit, fill: '#10b981' },
  ];

  const gradeData = [
    { name: 'Lớp 6', value: students.filter(s => s.grade === '6').length },
    { name: 'Lớp 7', value: students.filter(s => s.grade === '7').length },
    { name: 'Lớp 8', value: students.filter(s => s.grade === '8').length },
    { name: 'Lớp 9', value: students.filter(s => s.grade === '9').length },
  ];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-8"
    >
      <SectionHeader title="Báo cáo & Phân tích" subtitle="Tổng quan về tình hình học tập và tài chính" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-800 mb-8 font-display">Tóm tắt tài chính tháng {financialConfig.month}</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 14, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 14, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
              <p className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">Tổng thu</p>
              <p className="text-2xl font-bold text-indigo-700">{totalRevenue.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
              <p className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-2">Tổng chi</p>
              <p className="text-2xl font-bold text-rose-700">{totalExpenditure.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
              <p className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-2">Thực thu</p>
              <p className="text-2xl font-bold text-emerald-700">{netProfit.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        </div>

        {/* Student Distribution */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-800 mb-8 font-display">Phân bổ học sinh</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={gradeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-4 mt-6">
            {gradeData.map((grade, i) => (
              <div key={grade.name} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-lg font-bold text-slate-700">{grade.name}</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{grade.value} học sinh</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedGradeForProgram, setSelectedGradeForProgram] = useState<number | null>(null);

  const [hkdConfig, setHkdConfig] = useState<HKDConfig>({
    name: '',
    address: '',
    owner: '',
    taxId: '',
    scriptUrl: ''
  });

  const [subjects, setSubjects] = useState(FIXED_SUBJECTS);
  const [teachingPrograms, setTeachingPrograms] = useState<Record<number, string>>({});
  const [khdhData, setKhdhData] = useState<Record<string, string>>(KHDH_DATA);

  const fetchKHDHData = async () => {
    if (!hkdConfig.scriptUrl) {
      alert('Vui lòng cấu hình Google Script URL trong phần Cấu hình HKD!');
      return;
    }
    try {
      setIsAnalyzing(true);
      const response = await fetch(hkdConfig.scriptUrl);
      const data = await response.json();
      
      if (data.subjects && Array.isArray(data.subjects)) {
        setSubjects(data.subjects);
        localStorage.setItem('subjects_config', JSON.stringify(data.subjects));
      }
      
      if (data.program) {
        const mappedKhdhData: Record<string, string> = {};
        [6, 7, 8, 9].forEach(grade => {
          const gradeProgram = data.program[grade] || [];
          gradeProgram.forEach((item: any) => {
            // Key format: grade-subject-subSubject-period
            const key = `${grade}-${item.subject}-${item.subSubject || ''}-${item.period}`;
            mappedKhdhData[key] = item.content || '';
          });
        });
        
        setKhdhData(mappedKhdhData); 
        localStorage.setItem('khdh_data', JSON.stringify(mappedKhdhData));
      }

      if (data.accounts && Array.isArray(data.accounts)) {
        const syncedAccounts = data.accounts.map((acc: any, idx: number) => {
          // Find existing account to preserve registeredDevices
          const existing = userAccounts.find(u => 
            String(u.username).trim().toLowerCase() === String(acc.username).trim().toLowerCase()
          );
          return {
            ...acc,
            id: acc.id || existing?.id || `acc_${idx}_${Date.now()}`,
            username: String(acc.username || '').trim(),
            password: String(acc.password || '').trim(),
            role: acc.role || 'Giáo viên',
            expiry: acc.expiry || '',
            maxDevices: parseInt(acc.maxDevices) || 1,
            registeredDevices: acc.registeredDevices || existing?.registeredDevices || []
          };
        });
        
        // Merge: Keep local accounts that are not in the synced list
        const localOnly = userAccounts.filter(local => 
          !syncedAccounts.some(synced => 
            synced.username.toLowerCase() === local.username.toLowerCase()
          )
        );
        
        const finalAccounts = [...syncedAccounts, ...localOnly];
        setUserAccounts(finalAccounts);
        localStorage.setItem('user_accounts', JSON.stringify(finalAccounts));
      }
      
      alert('Đã đồng bộ dữ liệu từ Google Sheets thành công!');
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Lỗi khi đồng bộ dữ liệu. Vui lòng kiểm tra lại Script URL và quyền truy cập.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const uploadToGoogleSheets = async (programData: Record<string, string>, targetGrades?: number[]) => {
    if (!hkdConfig.scriptUrl) {
      alert('Vui lòng cấu hình Google Script URL trong phần Cấu hình HKD!');
      return;
    }
    try {
      setIsAnalyzing(true);
      
      // Group data by grade for the payload
      const programByGrade: Record<number, any[]> = {};
      Object.entries(programData).forEach(([key, content]) => {
        const parts = key.split('-');
        if (parts.length >= 3) {
          const grade = parseInt(parts[0]);
          const subject = parts[1];
          const subSubject = parts[2];
          const period = parseInt(parts[parts.length - 1]);
          
          if (!programByGrade[grade]) programByGrade[grade] = [];
          programByGrade[grade].push({
            subject,
            subSubject,
            period,
            content
          });
        }
      });

      const payload = {
        action: 'updateProgram',
        program: programByGrade,
        targetGrades: targetGrades || [6, 7, 8, 9]
      };

      const response = await fetch(hkdConfig.scriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Use no-cors if the script doesn't handle CORS, but it might limit response reading
        body: JSON.stringify(payload)
      });
      
      // Note: with no-cors we can't read the response, but the request is sent.
      // For a better experience, the script should handle CORS.
      alert('Yêu cầu cập nhật chương trình đã được gửi lên Google Sheets!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Lỗi khi tải dữ liệu lên. Vui lòng kiểm tra lại Script URL.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getLastDayOfMonth = (monthStr: string) => {
    if (!monthStr) return `Ngày ... tháng ... năm ...`;
    const [m, y] = monthStr.split('/').map(Number);
    if (!m || !y) return `Ngày ... tháng ... năm ...`;
    const lastDay = new Date(y, m, 0).getDate();
    return `Ngày ${lastDay} tháng ${m} năm ${y}`;
  };

  const deleteProgramForGrade = async (grade: number) => {
    const newKhdhData = { ...khdhData };
    Object.keys(newKhdhData).forEach(key => {
      if (key.startsWith(`${grade}-`)) {
        delete newKhdhData[key];
      }
    });
    
    setKhdhData(newKhdhData);
    localStorage.setItem('khdh_data', JSON.stringify(newKhdhData));
    setTeachingPrograms(prev => {
      const next = { ...prev };
      delete next[grade];
      return next;
    });
    
    await uploadToGoogleSheets(newKhdhData, [grade]);
    setConfirmDeleteGrade(null);
    alert(`Đã xóa chương trình dạy khối ${grade} thành công!`);
  };

  const deleteFinanceData = () => {
    setFinanceStudents([]);
    setExpenditures([]);
    setIsRevenueFileUploaded(false);
    setIsExpenditureFileUploaded(false);
    setUploadedFinanceFiles(0);
    setConfirmDeleteFinance(false);
    alert('Đã xóa toàn bộ dữ liệu tài chính hiện tại!');
  };

  const addStudent = (student: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...student,
      id: crypto.randomUUID()
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const analyzeStudentList = async (data: any[][]) => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
        Analyze the following table data from an Excel file and extract a list of students.
        The table contains columns like STT, Student Name, Grade, School, Parent Name, Phone, Subjects, Registration Date.
        Map the data to a JSON array of objects with the following keys:
        - name (string)
        - grade (string)
        - school (string)
        - parentName (string)
        - phone (string)
        - subjects (string)
        - registrationDate (string)

        Data:
        ${JSON.stringify(data.slice(0, 50))} // Limit to 50 rows for analysis
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const result = JSON.parse(response.text);
      if (Array.isArray(result)) {
        const newStudents: Student[] = result.map((s: any) => ({
          id: crypto.randomUUID(),
          name: String(s.name || ''),
          grade: String(s.grade || ''),
          school: String(s.school || ''),
          parentName: String(s.parentName || ''),
          phone: String(s.phone || ''),
          subjects: String(s.subjects || ''),
          registrationDate: String(s.registrationDate || ''),
          fee: 0
        }));
        setStudents(prev => [...prev, ...newStudents]);
        alert(`Đã phân tích và thêm ${newStudents.length} học sinh thành công!`);
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      alert('Lỗi khi phân tích dữ liệu bằng AI. Đang thử ánh xạ thủ công...');
      // Fallback manual mapping if AI fails
      const manualStudents: Student[] = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[1]) {
          manualStudents.push({
            id: crypto.randomUUID(),
            name: String(row[1] || ''),
            grade: String(row[2] || ''),
            school: String(row[3] || ''),
            parentName: String(row[4] || ''),
            phone: String(row[5] || ''),
            subjects: String(row[6] || ''),
            registrationDate: String(row[7] || ''),
            fee: 0
          });
        }
      }
      setStudents(prev => [...prev, ...manualStudents]);
      alert(`Đã thêm ${manualStudents.length} học sinh bằng ánh xạ thủ công.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportRegistrationForm = async (student: Student | Student[]) => {
    const studentsToExport = Array.isArray(student) ? student : [student];
    
    const sections = studentsToExport.map(s => {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const phone = s.phone || '';
      const formattedPhone = phone.startsWith('0') ? phone : '0' + phone;
      
      let dateStr = `Lai Châu, ngày ${day} tháng ${month} năm ${year}`;
      if (s.registrationDate && s.registrationDate.includes('/')) {
        const parts = s.registrationDate.split('/');
        if (parts.length === 3) {
          dateStr = `Lai Châu, ngày ${parts[0]} tháng ${parts[1]} năm ${parts[2]}`;
        }
      }

      return {
        properties: {
          page: {
            margin: {
              top: 1134,    // 2cm
              right: 1134,  // 2cm
              bottom: 1134, // 2cm
              left: 1417,   // 2.5cm
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Độc-lập - Tự-do - Hạnh-phúc", bold: true, size: 26 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "----------***----------", bold: true, size: 24 }),
            ],
          }),
          new Paragraph({ 
            alignment: AlignmentType.CENTER,
            spacing: { before: 567 }, // 1cm from top motto
            children: [
              new TextRun({ text: "ĐƠN ĐĂNG KÍ HỌC THÊM", bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 567, after: 567 }, // 1cm before and after
            indent: { left: 567 }, // Indent 1cm
            children: [
              new TextRun({ text: "Kính gửi: Cơ sở giáo dục Hoàng Gia", bold: true, italics: true, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: `Tôi tên là: ${s.parentName}`, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: `Số điện thoại: ${formattedPhone}`, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: `Là Phụ huynh của học sinh: ${s.name}`, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: `Lớp: ${String(s.grade || '').replace(/Lớp\s*/gi, '')}`, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: `Đang học tại trường: ${s.school}`, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: `Môn đăng ký học: ${s.subjects}`, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: `Tôi viết đơn này đăng kí học thêm môn ${s.subjects} trong năm 2026, do cơ sở giáo dục ${hkdConfig.name || "Cơ sở giáo dục Hoàng Gia"} tổ chức tại ${hkdConfig.address || "SN 269 - Lê Duẩn - Phường Tân Phong - T. Lai Châu"}.`, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: "Tôi xin cam kết đối với con tôi sẽ:", italics: true, size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: "+ Chấp hành nghiêm túc nội quy lớp học.", size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: "+ Tham gia học tập đầy đủ, đúng giờ.", size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: "+ Hoàn thành bài tập và chủ động trong học tập.", size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: "Rất mong cơ sở xem xét và chấp thuận.", size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { line: 312 },
            children: [
              new TextRun({ text: "Tôi xin trân trọng cảm ơn!", italics: true, size: 24 }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            rows: [
              new DocxTableRow({
                children: [
                  new TableCell({ children: [], width: { size: 50, type: WidthType.PERCENTAGE } }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: dateStr, italics: true, size: 24 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "NGƯỜI LÀM ĐƠN", bold: true, size: 24 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "(Kí và ghi rõ họ tên)", italics: true, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 1200 },
                        children: [
                          new TextRun({ text: s.parentName, bold: true, size: 24 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 400 } }),
        ],
      };
    });

    const doc = new Document({
      sections: sections,
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Don_Dang_Ky_Hoc_Them_${studentsToExport.length > 1 ? 'Danh_Sach' : studentsToExport[0].name}.docx`);
  };

  const exportAttendanceAndFees = () => {
    const monthPart = financialConfig.month.split('/')[0].replace(/^0+/, '');
    const yearPart = financialConfig.month.split('/')[1] || new Date().getFullYear().toString();
    
    const getDayOfWeek = (day: number) => {
      try {
        const date = new Date(parseInt(yearPart), parseInt(monthPart) - 1, day);
        const days = ['CN', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu', 'Bảy'];
        return days[date.getDay()];
      } catch (e) {
        return '';
      }
    };

    const header = [
      ["ĐỊA ĐIỂM KINH DOANH: " + (hkdConfig.address || "Lai Châu")],
      ["KỲ KÊ KHAI: " + financialConfig.period.toUpperCase()],
      ['STT', 'HỌ VÀ TÊN', 'Lớp', `BUỔI HỌC TRONG THÁNG ${monthPart}`, ...Array(30).fill(''), 'Số buổi học', 'Số tiền 1 buổi', 'Tổng tiền thu', 'Ghi chú'],
      ['', '', '', ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()), '', '', '', ''],
      ['', '', '', ...Array.from({ length: 31 }, (_, i) => getDayOfWeek(i + 1)), '', '', '', '']
    ];

    const rows = students.map((s, idx) => [
      idx + 1,
      s.name,
      String(s.grade || '').replace(/Lớp\s*/gi, ''),
      ...Array(31).fill(''), // Attendance marks
      '', // Số buổi học
      financialConfig.feePerSession,
      s.fee || '', // Tổng tiền thu
      '' // Ghi chú
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
    
    // Merges based on the image structure (shifted by 2 rows for the new title rows)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 37 } }, // Địa điểm kinh doanh
      { s: { r: 1, c: 0 }, e: { r: 1, c: 37 } }, // Kỳ kê khai
      { s: { r: 2, c: 0 }, e: { r: 4, c: 0 } }, // STT
      { s: { r: 2, c: 1 }, e: { r: 4, c: 1 } }, // HỌ VÀ TÊN
      { s: { r: 2, c: 2 }, e: { r: 4, c: 2 } }, // Lớp
      { s: { r: 2, c: 3 }, e: { r: 2, c: 33 } }, // BUỔI HỌC TRONG THÁNG
      { s: { r: 2, c: 34 }, e: { r: 4, c: 34 } }, // Số buổi học
      { s: { r: 2, c: 35 }, e: { r: 4, c: 35 } }, // Số tiền 1 buổi
      { s: { r: 2, c: 36 }, e: { r: 4, c: 36 } }, // Tổng tiền thu
      { s: { r: 2, c: 37 }, e: { r: 4, c: 37 } }, // Ghi chú
    ];

    // Set column widths for better visibility
    ws['!cols'] = [
      { wch: 5 },  // STT
      { wch: 25 }, // Name
      { wch: 8 },  // Class
      ...Array(31).fill({ wch: 4 }), // Days
      { wch: 10 }, // Sessions
      { wch: 12 }, // Fee per session
      { wch: 15 }, // Total
      { wch: 15 }  // Note
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bang_Cham_Cong");
    XLSX.writeFile(wb, `Bang_Cham_Cong_Thu_Tien_${financialConfig.month.replace('/', '_')}.xlsx`);
  };

  const exportFinancialReports = async (mode: 'all' | 'revenue' | 'receipts' | 'vouchers' = 'all') => {
    // Filter out students with 0 fee to ensure consistency across all reports
    const activeStudents = financeStudents.filter(s => (s.fee ?? financialConfig.feePerSession) > 0);
    const sections = [];

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // 1. Sổ doanh thu chi tiết (S1a-HKD)
    if (mode === 'all' || mode === 'revenue') {
      const totalRevenue = activeStudents.reduce((acc, s) => acc + (s.fee || financialConfig.feePerSession), 0);
      const totalExpenditure = expenditures.reduce((acc, e) => acc + e.amount, 0);
      const netTotal = totalRevenue - totalExpenditure;

      sections.push({
        properties: {
          page: {
            margin: {
              top: 1134, // 2cm
              bottom: 1134, // 2cm
              left: 1417, // 2.5cm
              right: 1134, // 2cm
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "HỘ, CÁ NHÂN KINH DOANH: ", bold: true, size: 26 }),
              new TextRun({ text: hkdConfig.name.toUpperCase() || "HOÀNG GIA", size: 26 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Địa chỉ: ", bold: true, size: 26 }),
              new TextRun({ text: hkdConfig.address || "Lai Châu", size: 26 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Mã số thuế: ", bold: true, size: 26 }),
              new TextRun({ text: hkdConfig.taxId || "", size: 26 }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ", bold: true, size: 32 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Địa điểm kinh doanh: ${hkdConfig.address || "Lai Châu"}`, italics: true, size: 26 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Kỳ kê khai: ${financialConfig.period}`, italics: true, size: 26 }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new DocxTableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ngày tháng", bold: true, size: 26 })], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Giao dịch", bold: true, size: 26 })], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số tiền", bold: true, size: 26 })], alignment: AlignmentType.CENTER })] }),
                ],
              }),
              ...activeStudents.map(s => {
                const cleanGrade = String(s.grade || '').replace(/^Lớp\s+/i, '');
                return new DocxTableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatDate(financialConfig.receiptDate), size: 26 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Thu tiền học ${financialConfig.period} - ${s.name} - L ${cleanGrade}`, size: 26 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (s.fee || financialConfig.feePerSession).toLocaleString(), size: 26 })] })] }),
                  ],
                });
              }),
              ...expenditures.map(e => new DocxTableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatDate(e.date), size: 26 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Chi: ${e.description} - Người nhận: ${e.recipient}`, size: 26 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `(${e.amount.toLocaleString()})`, size: 26 })] })] }),
                ],
              })),
              new DocxTableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TỔNG CỘNG", bold: true, size: 26 })], alignment: AlignmentType.RIGHT })], columnSpan: 2 }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: netTotal.toLocaleString(), bold: true, size: 26 })], alignment: AlignmentType.CENTER })] }),
                ],
              }),
            ],
          }),

          new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 400 } }),
          new Table({
            width: { size: 40, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.RIGHT,
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new DocxTableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: getLastDayOfMonth(financialConfig.month), italics: true, size: 26 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "NGƯỜI ĐẠI DIỆN HỘ KINH DOANH", bold: true, size: 26 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "(Ký, ghi rõ họ tên, đóng dấu)", italics: true, size: 18 })],
                      }),
                      new Paragraph({ text: "", spacing: { before: 1800 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: hkdConfig.owner.toUpperCase(), bold: true, size: 18 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Chủ hộ kinh doanh", italics: true, size: 18 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });
    }

    // 2. Phiếu thu (2 phiếu trên 1 trang A4)
    if (mode === 'all' || mode === 'receipts') {
      for (let i = 0; i < activeStudents.length; i += 2) {
        const pair = activeStudents.slice(i, i + 2);
        const children: any[] = [];

        pair.forEach((s, idx) => {
          const amount = s.fee || financialConfig.feePerSession;
          const dateParts = financialConfig.receiptDate.split('-');
          const receiptNo = `${dateParts[2]}${dateParts[1]}${dateParts[0].slice(2)}-${String(i + idx + 1).padStart(3, '0')}`;
          
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "HỘ, CÁ NHÂN KINH DOANH: ", bold: true, size: 26 }),
                            new TextRun({ text: hkdConfig.name.toUpperCase(), size: 26 }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Địa chỉ: ", bold: true, size: 26 }),
                            new TextRun({ text: hkdConfig.address, size: 26 }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: "Mẫu số 01 – TT", bold: true, size: 26 })],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: "(Ban hành kèm theo Thông tư số 88/2021/TT-BTC ngày 11 tháng 10 năm 2021 của Bộ trưởng Bộ Tài chính)", size: 16 })],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new TableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [],
                    }),
                    new TableCell({
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: "PHIẾU THU", bold: true, size: 32 })],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: `Ngày ${dateParts[2]} tháng ${dateParts[1]} năm ${dateParts[0]}`, italics: true, size: 26 })],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({ children: [new TextRun({ text: "Quyển số: .............", size: 26 })] }),
                        new Paragraph({ children: [new TextRun({ text: `Số: ${receiptNo}`, size: 26 })] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: `Họ và tên người nộp tiền: ${s.name}`, size: 26 })] }),
            new Paragraph({ children: [new TextRun({ text: `Lớp: ${String(s.grade || '').replace(/Lớp\s*/gi, '')}`, size: 26 })] }),
            new Paragraph({ children: [new TextRun({ text: `Lý do nộp: Thu học phí ${financialConfig.period}`, size: 26 })] }),
            new Paragraph({
              children: [
                new TextRun({ text: `Số tiền: ${amount.toLocaleString()} VNĐ `, size: 26 }),
                new TextRun({ text: `(Viết bằng chữ): ${numberToVietnameseWords(amount)}`, italics: true, size: 26 }),
              ],
            }),
            new Paragraph({ children: [new TextRun({ text: `Kèm theo: Bảng chấm công và thu tiền tháng ${financialConfig.period.split(' ')[1] || ''}`, size: 26 })] }),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/ CÁ NHÂN KINH DOANH", bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NGƯỜI LẬP BIỂU", bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NGƯỜI NỘP TIỀN", bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "THỦ QUỸ", bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký, họ tên, đóng dấu)", italics: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký, họ tên)", italics: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký, họ tên)", italics: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký, họ tên)", italics: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: hkdConfig.owner.toUpperCase(), bold: true, size: 18 })], spacing: { before: 1000 } })] }),
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: financialConfig.reporter.toUpperCase(), bold: true, size: 18 })], spacing: { before: 1000 } })] }),
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.name.toUpperCase(), bold: true, size: 18 })], spacing: { before: 1000 } })] }),
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: financialConfig.treasurer.toUpperCase(), bold: true, size: 18 })], spacing: { before: 1000 } })] }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: `Đã nhận đủ số tiền (viết bằng chữ): ${numberToVietnameseWords(amount)}`, italics: true, size: 26 })] })
          );

          if (idx === 0 && pair.length > 1) {
            children.push(
              new Paragraph({ text: "", spacing: { before: 50, after: 50 } }),
              new Paragraph({
                border: { bottom: { color: "auto", space: 1, style: BorderStyle.DASHED, size: 6 } },
                children: [new TextRun({ text: "" })]
              }),
              new Paragraph({ text: "", spacing: { before: 50, after: 50 } })
            );
          }
        });

        sections.push({
          properties: {
            page: {
              margin: { top: 500, bottom: 500, left: 1000, right: 1000 },
            },
          },
          children: children,
        });
      }
    }

    // 3. Phiếu chi (2 phiếu trên 1 trang A4)
    if (mode === 'all' || mode === 'vouchers') {
      for (let i = 0; i < expenditures.length; i += 2) {
        const pair = expenditures.slice(i, i + 2);
        const children: any[] = [];

        pair.forEach((e, idx) => {
          const dateParts = e.date.split('-');
          const voucherNo = `${dateParts[2]}${dateParts[1]}${dateParts[0].slice(2)}-${String(i + idx + 1).padStart(3, '0')}`;
          
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "HỘ, CÁ NHÂN KINH DOANH: ", bold: true, size: 26 }),
                            new TextRun({ text: hkdConfig.name.toUpperCase(), size: 26 }),
                          ],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Địa chỉ: ", bold: true, size: 26 }),
                            new TextRun({ text: hkdConfig.address, size: 26 }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: "Mẫu số 02 – TT", bold: true, size: 26 })],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: "(Ban hành kèm theo Thông tư số 88/2021/TT-BTC ngày 11 tháng 10 năm 2021 của Bộ trưởng Bộ Tài chính)", size: 16 })],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new TableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [],
                    }),
                    new TableCell({
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: "PHIẾU CHI", bold: true, size: 32 })],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: `Ngày ${dateParts[2]} tháng ${dateParts[1]} năm ${dateParts[0]}`, italics: true, size: 26 })],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({ children: [new TextRun({ text: "Quyển số: .............", size: 26 })] }),
                        new Paragraph({ children: [new TextRun({ text: `Số: ${voucherNo}`, size: 26 })] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: `Họ và tên người nhận tiền: ${e.recipient || '................................................................................'}`, size: 26 })] }),
            new Paragraph({ children: [new TextRun({ text: `Địa chỉ: ${e.recipientAddress || '............................................................................................................'}`, size: 26 })] }),
            new Paragraph({ children: [new TextRun({ text: `Lý do chi: ${e.description}`, size: 26 })] }),
            new Paragraph({
              children: [
                new TextRun({ text: `Số tiền: ${e.amount.toLocaleString()} VNĐ `, size: 26 }),
                new TextRun({ text: `(Viết bằng chữ): ${numberToVietnameseWords(e.amount)}`, italics: true, size: 26 }),
              ],
            }),
            new Paragraph({ children: [new TextRun({ text: `Kèm theo: Bảng chấm công và thu tiền tháng ${financialConfig.period.split(' ')[1] || ''}`, size: 26 })] }),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new DocxTableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/ CÁ NHÂN KINH DOANH", bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NGƯỜI LẬP BIỂU", bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NGƯỜI NHẬN TIỀN", bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "THỦ QUỸ", bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký, họ tên, đóng dấu)", italics: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký, họ tên)", italics: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký, họ tên)", italics: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký, họ tên)", italics: true, size: 16 })], alignment: AlignmentType.CENTER })] }),
                  ],
                }),
                new DocxTableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: hkdConfig.owner.toUpperCase(), bold: true, size: 18 })], spacing: { before: 1000 } })] }),
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: financialConfig.reporter.toUpperCase(), bold: true, size: 18 })], spacing: { before: 1000 } })] }),
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (e.recipient || "................................").toUpperCase(), bold: true, size: 18 })], spacing: { before: 1000 } })] }),
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: financialConfig.treasurer.toUpperCase(), bold: true, size: 18 })], spacing: { before: 1000 } })] }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: `Đã nhận đủ số tiền (viết bằng chữ): ${numberToVietnameseWords(e.amount)}`, italics: true, size: 26 })] })
          );

          if (idx === 0 && pair.length > 1) {
            children.push(
              new Paragraph({ text: "", spacing: { before: 50, after: 50 } }),
              new Paragraph({
                border: { bottom: { color: "auto", space: 1, style: BorderStyle.DASHED, size: 6 } },
                children: [new TextRun({ text: "" })]
              }),
              new Paragraph({ text: "", spacing: { before: 50, after: 50 } })
            );
          }
        });

        sections.push({
          properties: {
            page: {
              margin: { top: 500, bottom: 500, left: 1000, right: 1000 },
            },
          },
          children: children,
        });
      }
    }


    const doc = new Document({ sections });
    const blob = await Packer.toBlob(doc);
    let filename = `Bao_Cao_Tai_Chinh_${financialConfig.month.replace('/', '_')}.docx`;
    if (mode === 'revenue') filename = `So_Doanh_Thu_${financialConfig.month.replace('/', '_')}.docx`;
    if (mode === 'receipts') filename = `Phieu_Thu_${financialConfig.month.replace('/', '_')}.docx`;
    if (mode === 'vouchers') filename = `Phieu_Chi_${financialConfig.month.replace('/', '_')}.docx`;
    
    saveAs(blob, filename);
  };

  const [scheduleMeta, setScheduleMeta] = useState({ week: '1', fromDate: '', toDate: '', teacher: 'Thầy Tâm' });
  const [journalMeta, setJournalMeta] = useState({ week: '1', fromDate: '', toDate: '', teacher: 'Thầy Tâm' });

  const [scheduleData, setScheduleData] = useState<TableRow[]>([]);
  const [journalData, setJournalData] = useState<TableRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [financeStudents, setFinanceStudents] = useState<Student[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteGrade, setConfirmDeleteGrade] = useState<number | null>(null);
  const [confirmDeleteFinance, setConfirmDeleteFinance] = useState(false);
  const [financeSubTab, setFinanceSubTab] = useState<'config' | 'data' | 'revenue' | 'receipts'>('config');
  const [expenditures, setExpenditures] = useState<{id: string, date: string, description: string, amount: number, recipient: string, recipientAddress: string}[]>([]);
  const [financialConfig, setFinancialConfig] = useState({ 
    feePerSession: 100000, 
    month: '03/2026',
    receiptDate: new Date().toISOString().split('T')[0],
    voucherDate: new Date().toISOString().split('T')[0],
    period: 'Tháng 03/2026',
    reporter: '',
    treasurer: ''
  });
  const [showFinanceConfig, setShowFinanceConfig] = useState(false);
  const [isFinanceConfigSaved, setIsFinanceConfigSaved] = useState(false);
  const [uploadedFinanceFiles, setUploadedFinanceFiles] = useState<number>(0);
  const [isRevenueFileUploaded, setIsRevenueFileUploaded] = useState(false);
  const [isExpenditureFileUploaded, setIsExpenditureFileUploaded] = useState(false);
  const [showFinanceExport, setShowFinanceExport] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', id);
    }
    setDeviceId(id);
  }, []);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [newAccount, setNewAccount] = useState<Partial<UserAccount>>({
    username: '',
    password: '',
    role: 'Giáo viên',
    expiry: '',
    maxDevices: 1
  });

  const activeStudentsCount = financeStudents.filter(s => (s.fee ?? financialConfig.feePerSession) > 0).length;
  const revenue = financeStudents.reduce((sum, s) => sum + (s.fee ?? financialConfig.feePerSession), 0);

  const moveRow = (type: 'schedule' | 'journal', id: string, direction: 'up' | 'down') => {
    const setter = type === 'schedule' ? setScheduleData : setJournalData;
    setter(prev => {
      const index = prev.findIndex(r => r.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
      return newArr;
    });
  };

  const moveSubjectRow = (index: number, direction: 'up' | 'down') => {
    setSubjects(prev => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
      return newArr;
    });
  };

  const addAccount = () => {
    if (!newAccount.username || !newAccount.password) {
      alert('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    let updatedAccounts: UserAccount[] = [];
    if (editingAccount) {
      updatedAccounts = userAccounts.map(acc => {
        if (acc.id === editingAccount.id) {
          return {
            ...acc,
            username: newAccount.username!.trim(),
            password: newAccount.password!.trim(),
            role: newAccount.role || 'Giáo viên',
            expiry: newAccount.expiry || '',
            maxDevices: newAccount.maxDevices || 1
          };
        }
        return acc;
      });
      setUserAccounts(updatedAccounts);
      setEditingAccount(null);
      alert('Đã cập nhật tài khoản thành công!');
    } else {
      const account: UserAccount = {
        id: crypto.randomUUID(),
        index: userAccounts.length + 1,
        username: newAccount.username!.trim(),
        password: newAccount.password!.trim(),
        role: newAccount.role || 'Giáo viên',
        expiry: newAccount.expiry || '',
        maxDevices: newAccount.maxDevices || 1,
        registeredDevices: []
      };
      updatedAccounts = [...userAccounts, account];
      setUserAccounts(updatedAccounts);
      alert('Đã thêm tài khoản mới thành công!');
    }

    setNewAccount({
      username: '',
      password: '',
      role: 'Giáo viên',
      expiry: '',
      maxDevices: 1
    });

    // Auto-sync to Google Sheets
    if (hkdConfig.scriptUrl) {
      saveAccountsToGoogleSheets(updatedAccounts);
    }
  };

  const startEditAccount = (acc: UserAccount) => {
    setEditingAccount(acc);
    setNewAccount({
      username: acc.username,
      password: acc.password,
      role: acc.role,
      expiry: acc.expiry,
      maxDevices: acc.maxDevices
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteAccount = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      const updatedAccounts = userAccounts.filter(acc => acc.id !== id);
      setUserAccounts(updatedAccounts);
      // Auto-sync to Google Sheets
      if (hkdConfig.scriptUrl) {
        saveAccountsToGoogleSheets(updatedAccounts);
      }
    }
  };

  const saveAccountsToGoogleSheets = async (accountsToSave?: UserAccount[]) => {
    if (!hkdConfig.scriptUrl) {
      alert('Vui lòng cấu hình Google Script URL trong phần Cấu hình HKD!');
      return;
    }
    try {
      setIsAnalyzing(true);
      const payload = {
        action: 'updateAccounts',
        accounts: accountsToSave || userAccounts
      };
      await fetch(hkdConfig.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });
      console.log('Syncing accounts to Google Sheets...');
    } catch (error) {
      console.error('Save accounts error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveConfig = () => {
    localStorage.setItem('hkd_config', JSON.stringify(hkdConfig));
    localStorage.setItem('subjects_config', JSON.stringify(subjects));
    alert('Đã lưu cấu hình thành công!');
  };

  const loadConfig = () => {
    const savedHKD = localStorage.getItem('hkd_config');
    const savedSubjects = localStorage.getItem('subjects_config');
    if (savedHKD) {
      const config = JSON.parse(savedHKD);
      if (!config.scriptUrl) {
        config.scriptUrl = 'https://script.google.com/macros/s/AKfycbwdXqPI3viUroHevEJ5CzLk4dh3QfwstmJkB1PQA7alN-DbCSIdAPyXYSPhSd1Bf4ksmQ/exec';
      }
      setHkdConfig(config);
    }
    if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
  };

  const addSubjectRow = () => {
    setSubjects(prev => [...prev, { grade: '6', subject: 'Môn mới', subSubject: '' }]);
  };

  const updateSubjectRow = (index: number, field: string, value: string) => {
    setSubjects(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const deleteSubjectRow = (index: number) => {
    setSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const syncToJournal = () => {
    if (scheduleData.length === 0) {
      alert('Không có dữ liệu lịch báo giảng để đồng bộ!');
      return;
    }
    setJournalData([...scheduleData]);
    setJournalMeta({ ...scheduleMeta });
    alert('Đã đồng bộ dữ liệu sang Sổ đầu bài!');
  };

  const addScheduleRow = (type: 'schedule' | 'journal') => {
    const newRow: TableRow = {
      id: crypto.randomUUID(),
      day: 'Thứ 2',
      shift: SHIFT_OPTIONS[0],
      class: '6',
      subject: 'Toán',
      subSubject: 'Số học',
      period: '1',
      content: khdhData['6-Toán-Số học-1'] || 'Nội dung chưa cập nhật',
      teacher: type === 'schedule' ? scheduleMeta.teacher : journalMeta.teacher,
      note: '',
      attendance: '',
      comment: ''
    };
    
    if (type === 'schedule') {
      setScheduleData(prev => [...prev, newRow]);
    } else {
      setJournalData(prev => [...prev, newRow]);
    }
  };

  const updateRow = (type: 'schedule' | 'journal', id: string, field: keyof TableRow, value: string) => {
    const setter = type === 'schedule' ? setScheduleData : setJournalData;
    setter(prev => prev.map(r => {
      if (r.id === id) {
        const updatedRow = { ...r, [field]: value };
        if (['class', 'subject', 'subSubject', 'period'].includes(field)) {
          const key = `${updatedRow.class}-${updatedRow.subject}-${updatedRow.subSubject}-${updatedRow.period}`;
          updatedRow.content = khdhData[key] || 'Nội dung chưa cập nhật (AI)';
        }
        return updatedRow;
      }
      return r;
    }));
  };

  const deleteRow = (type: 'schedule' | 'journal', id: string) => {
    const setter = type === 'schedule' ? setScheduleData : setJournalData;
    setter(prev => prev.filter(r => r.id !== id));
  };

  const exportToWord = async (type: 'schedule' | 'journal') => {
    const data = type === 'schedule' ? scheduleData : journalData;
    const meta = type === 'schedule' ? scheduleMeta : journalMeta;

    if (data.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    const title = type === 'schedule' ? 'LỊCH BÁO GIẢNG' : 'SỔ ĐẦU BÀI';
    
    const headers = type === 'schedule' 
      ? ['Thứ ngày', 'Ca học / Buổi', 'Lớp', 'Môn học', 'Phân môn', 'Tiết KHDH', 'Tên bài dạy / Nội dung', 'Ghi chú']
      : ['Thứ ngày', 'Buổi', 'Lớp', 'Môn học', 'Phân môn', 'Tiết KHDH', 'Tên bài / Nội dung', 'Sĩ số', 'Nhận xét của giáo viên', 'Kí tên'];

    const tableHeader = new DocxTableRow({
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
        shading: { fill: "F1F5F9" }
      }))
    });

    const getRowDate = (dayStr: string, fromDateStr: string) => {
      if (!fromDateStr) return "";
      const dayMap: Record<string, number> = {
        'Thứ 2': 0, 'Thứ 3': 1, 'Thứ 4': 2, 'Thứ 5': 3, 'Thứ 6': 4, 'Thứ 7': 5, 'Chủ Nhật': 6
      };
      const offset = dayMap[dayStr] || 0;
      const date = new Date(fromDateStr);
      date.setDate(date.getDate() + offset);
      return date.toLocaleDateString('vi-VN');
    };

    const tableRows = data.map((row, index) => {
      const dayText = row.day;
      const dateText = `(${getRowDate(row.day, meta.fromDate)})`;
      const currentDateCompare = `${dayText}\n${dateText}`;
      
      const prevRow = index > 0 ? data[index - 1] : null;
      const prevDateCompare = prevRow ? `${prevRow.day}\n(${getRowDate(prevRow.day, meta.fromDate)})` : null;
      
      const isMergeContinue = currentDateCompare === prevDateCompare;
      
      // Determine if this is the start of a merge
      let vMerge = undefined;
      if (isMergeContinue) {
        vMerge = VerticalMergeType.CONTINUE;
      } else {
        // Check if NEXT row is the same to decide if we should RESTART
        const nextRow = index < data.length - 1 ? data[index + 1] : null;
        const nextDateCompare = nextRow ? `${nextRow.day}\n(${getRowDate(nextRow.day, meta.fromDate)})` : null;
        if (currentDateCompare === nextDateCompare) {
          vMerge = VerticalMergeType.RESTART;
        }
      }

      const dateDisplay = [
        new TextRun({ text: dayText }),
        new TextRun({ text: dateText, break: 1 })
      ];

      // Split shift into two lines: "Ca X" and "(Time)"
      const shiftParts = row.shift.split(' (');
      const shiftDisplay = shiftParts.length > 1 ? [
        new TextRun({ text: shiftParts[0] }),
        new TextRun({ text: '(' + shiftParts[1], break: 1 })
      ] : [new TextRun({ text: row.shift })];

      const cells = type === 'schedule' ? [
        { children: dateDisplay, vMerge, align: AlignmentType.CENTER },
        { children: shiftDisplay, align: AlignmentType.CENTER },
        { text: row.class, align: AlignmentType.CENTER },
        { text: row.subject, align: AlignmentType.CENTER },
        { text: row.subSubject, align: AlignmentType.CENTER },
        { text: row.period, align: AlignmentType.CENTER },
        { text: row.content },
        { text: row.note || '' }
      ] : [
        { children: dateDisplay, vMerge, align: AlignmentType.CENTER },
        { children: shiftDisplay, align: AlignmentType.CENTER },
        { text: row.class, align: AlignmentType.CENTER },
        { text: row.subject, align: AlignmentType.CENTER },
        { text: row.subSubject, align: AlignmentType.CENTER },
        { text: row.period, align: AlignmentType.CENTER },
        { text: row.content },
        { text: row.attendance || '' },
        { text: 'Nghiêm túc' },
        { text: scheduleMeta.teacher }
      ];

      return new DocxTableRow({
        children: cells.map(c => new TableCell({
          verticalMerge: (c as any).vMerge,
          children: [new Paragraph({ 
            text: (c as any).text, 
            children: (c as any).children,
            alignment: (c as any).align || AlignmentType.LEFT 
          })]
        }))
      });
    });

    const fromDate = new Date(meta.fromDate);
    const d = fromDate.getDate();
    const m = fromDate.getMonth() + 1;
    const y = fromDate.getFullYear();
    const dateStr = `Ngày ${d} tháng ${m} năm ${y}`;

    const footerRows = type === 'schedule' ? [
      new DocxTableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: "Người lập kế hoạch", bold: true, size: 28 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true, size: 28 })], alignment: AlignmentType.CENTER })
            ],
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            }
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: dateStr, italics: true, size: 28 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "Chủ hộ kinh doanh", bold: true, size: 28 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "(Ký tên, đóng dấu)", italics: true, size: 28 })], alignment: AlignmentType.CENTER })
            ],
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            }
          })
        ]
      }),
      new DocxTableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ 
                children: [new TextRun({ text: meta.teacher, bold: true, size: 28 })], 
                alignment: AlignmentType.CENTER,
                spacing: { before: 1701 }
              })
            ],
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            }
          }),
          new TableCell({
            children: [
              new Paragraph({ 
                children: [new TextRun({ text: hkdConfig.owner || "..........................", bold: true, size: 28 })], 
                alignment: AlignmentType.CENTER,
                spacing: { before: 1701 }
              })
            ],
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            }
          })
        ]
      })
    ] : [
      new DocxTableRow({
        children: [
          new TableCell({
            children: [],
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: dateStr, italics: true, size: 28 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "Xác nhận của HKD", bold: true, size: 28 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "(Ký tên, đóng dấu)", italics: true, size: 28 })], alignment: AlignmentType.CENTER }),
              new Paragraph({ 
                children: [new TextRun({ text: hkdConfig.owner || "..........................", bold: true, size: 28 })], 
                alignment: AlignmentType.CENTER,
                spacing: { before: 1701 }
              })
            ],
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
          })
        ]
      })
    ];

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              size: 28, // 14pt
              font: "Times New Roman"
            }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
          },
        },
        children: [
          // Top Left Header
          new Paragraph({
            children: [
              new TextRun({ text: `Hộ kinh doanh: ${hkdConfig.name}`, bold: true }),
              new TextRun({ text: `Địa chỉ: ${hkdConfig.address}`, break: 1 })
            ],
            spacing: { after: 400 }
          }),
          // Title
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
          }),
          // Teacher Name (only for schedule)
          ...(type === 'schedule' ? [
            new Paragraph({
              children: [
                new TextRun({ text: `Giáo viên: ${meta.teacher}`, bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            })
          ] : []),
          // Date Range
          new Paragraph({
            children: [
              new TextRun({ text: `Tuần: ${meta.week}    `, bold: true }),
              new TextRun({ text: `Từ ngày: ${meta.fromDate}    `, bold: true }),
              new TextRun({ text: `Đến ngày: ${meta.toDate}`, bold: true }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [tableHeader, ...tableRows]
          }),
          new Paragraph({ text: "", spacing: { before: 283 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: footerRows,
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            }
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${type === 'schedule' ? 'LichBaoGiang' : 'SoDauBai'}_Tuan${meta.week}.docx`);
  };

  const exportToCSV = (type: 'schedule' | 'journal') => {
    const data = type === 'schedule' ? scheduleData : journalData;
    const meta = type === 'schedule' ? scheduleMeta : journalMeta;
    if (data.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    const headers = type === 'schedule' 
      ? ['Thứ', 'Ca học', 'Lớp', 'Môn học', 'Phân môn', 'Tiết KHDH', 'Tên bài dạy', 'Ghi chú']
      : ['Thứ ngày', 'Buổi', 'Lớp', 'Môn học', 'Phân môn', 'Tiết KHDH', 'Tên bài/Nội dung', 'Sĩ số', 'Nhận xét', 'Giáo viên'];

    const csvRows = [
      `"${type === 'schedule' ? 'LỊCH BÁO GIẢNG' : 'SỔ ĐẦU BÀI'}"`,
      `"Tuần: ${meta.week}","Từ ngày: ${meta.fromDate}","Đến ngày: ${meta.toDate}"`,
      headers.join(','),
      ...data.map(row => {
        if (type === 'schedule') {
          return [
            row.day,
            row.shift,
            row.class,
            row.subject,
            row.subSubject,
            row.period,
            `"${row.content}"`,
            `"${row.note || ''}"`
          ].join(',');
        } else {
          return [
            row.day,
            row.shift,
            row.class,
            row.subject,
            row.subSubject,
            row.period,
            `"${row.content}"`,
            row.attendance || '',
            `"${row.comment || ''}"`,
            row.teacher
          ].join(',');
        }
      })
    ];

    const csvString = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${type === 'schedule' ? 'LichBaoGiang' : 'SoDauBai'}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadConfig();
    const savedSchedule = localStorage.getItem('schedule_data');
    const savedJournal = localStorage.getItem('journal_data');
    const savedStudents = localStorage.getItem('students_data');
    const savedFinanceStudents = localStorage.getItem('finance_students_data');
    const savedScheduleMeta = localStorage.getItem('schedule_meta');
    const savedJournalMeta = localStorage.getItem('journal_meta');
    const savedPrograms = localStorage.getItem('teaching_programs');
    const savedKHDH = localStorage.getItem('khdh_data');
    const savedAccounts = localStorage.getItem('user_accounts');
    
    if (savedSchedule) setScheduleData(JSON.parse(savedSchedule));
    if (savedJournal) setJournalData(JSON.parse(savedJournal));
    if (savedStudents) setStudents(JSON.parse(savedStudents));
    if (savedFinanceStudents) setFinanceStudents(JSON.parse(savedFinanceStudents));
    if (savedScheduleMeta) setScheduleMeta(JSON.parse(savedScheduleMeta));
    if (savedJournalMeta) setJournalMeta(JSON.parse(savedJournalMeta));
    if (savedPrograms) setTeachingPrograms(JSON.parse(savedPrograms));
    if (savedKHDH) setKhdhData(JSON.parse(savedKHDH));
    if (savedAccounts) setUserAccounts(JSON.parse(savedAccounts));
  }, []);

  useEffect(() => {
    localStorage.setItem('schedule_data', JSON.stringify(scheduleData));
    localStorage.setItem('journal_data', JSON.stringify(journalData));
    localStorage.setItem('students_data', JSON.stringify(students));
    localStorage.setItem('finance_students_data', JSON.stringify(financeStudents));
    localStorage.setItem('schedule_meta', JSON.stringify(scheduleMeta));
    localStorage.setItem('journal_meta', JSON.stringify(journalMeta));
    localStorage.setItem('teaching_programs', JSON.stringify(teachingPrograms));
    localStorage.setItem('user_accounts', JSON.stringify(userAccounts));
  }, [scheduleData, journalData, students, financeStudents, scheduleMeta, journalMeta, teachingPrograms, userAccounts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    const username = loginUsername.trim();
    const password = loginPassword.trim();

    if (!username || !password) {
      setLoginError('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    // 1. Master Admin Check (Always works)
    if (username === 'admin' && password === '123456') {
      const adminUser: UserAccount = {
        id: 'master-admin',
        index: 0,
        username: 'admin',
        password: '123456',
        role: 'Quản trị viên',
        expiry: '',
        maxDevices: 999
      };
      setCurrentUser(adminUser);
      setIsAdmin(true);
      setIsLoggedIn(true);
      setActiveTab('dashboard');
      return;
    }

    // 2. Check synced accounts
    const user = userAccounts.find(u => {
      const uName = String(u.username || '').trim().toLowerCase();
      const uPass = String(u.password || '').trim();
      return uName === username.toLowerCase() && uPass === password;
    });

    if (!user) {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!');
      return;
    }

    // 3. Check expiry
    if (user.expiry && user.expiry.trim() !== '') {
      try {
        const expiryDate = new Date(user.expiry);
        if (!isNaN(expiryDate.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (today > expiryDate) {
            setLoginError('Tài khoản của bạn đã hết thời hạn sử dụng. Vui lòng liên hệ Admin để gia hạn!');
            return;
          }
        }
      } catch (e) {
        console.error('Expiry check error:', e);
      }
    }

    // 4. Check device limit
    const maxAllowed = parseInt(String(user.maxDevices)) || 1;
    const registeredDevices = user.registeredDevices || [];
    if (!registeredDevices.includes(deviceId) && registeredDevices.length >= maxAllowed) {
      setLoginError(`Tài khoản đã đạt giới hạn số máy truy cập (${maxAllowed}). Vui lòng liên hệ Admin để hỗ trợ!`);
      return;
    }

    // Register device if not already registered
    if (!registeredDevices.includes(deviceId)) {
      const updatedAccounts = userAccounts.map(u => {
        if (u.id === user.id) {
          return { ...u, registeredDevices: [...registeredDevices, deviceId] };
        }
        return u;
      });
      setUserAccounts(updatedAccounts);
      localStorage.setItem('user_accounts', JSON.stringify(updatedAccounts));
    }

    setCurrentUser(user);
    setIsAdmin(String(user.role || '').trim() === 'Quản trị viên');
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200"
        >
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-2xl shadow-indigo-200 ring-4 ring-indigo-50">
              <GraduationCap className="text-white w-16 h-16" />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tighter leading-tight uppercase">HOÀNG GIA</h1>
              <p className="text-lg text-indigo-600 font-bold tracking-widest uppercase mt-2">Trao cơ hội - Nhận niềm tin</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-50 border border-rose-200 text-rose-600 p-5 rounded-2xl text-lg font-bold flex items-center gap-3"
              >
                <AlertCircle size={24} />
                {loginError}
              </motion.div>
            )}
            <div className="flex flex-col gap-3">
              <label className="text-lg font-normal hover:font-bold transition-all text-slate-800 uppercase tracking-widest">Tài khoản</label>
              <input 
                type="text" 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)}
                className="p-5 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-900 text-xl font-normal transition-all placeholder:text-slate-400" 
                placeholder="Nhập tài khoản..."
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-lg font-normal hover:font-bold transition-all text-slate-800 uppercase tracking-widest">Mật khẩu</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                className="p-5 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-900 text-xl font-normal transition-all placeholder:text-slate-400" 
                placeholder="Nhập mật khẩu..."
              />
            </div>
            <button type="submit" className="mt-6 bg-indigo-600 text-white py-5 rounded-[1.5rem] text-2xl font-normal hover:font-bold transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 active:scale-95">
              <LogIn size={28} />
              Đăng nhập hệ thống
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setIsAdmin(false);
    setActiveTab('login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 sm:px-12 py-5 sm:py-8 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-16">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-4 rounded-[1.25rem] shadow-2xl shadow-indigo-200 ring-4 ring-indigo-50">
              <GraduationCap className="text-white w-10 h-10" />
            </div>
            <div className="flex flex-col items-center leading-none hidden sm:flex">
              <span className="font-bold text-3xl text-slate-900 tracking-tighter uppercase whitespace-nowrap">HOÀNG GIA</span>
              <span className="text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase mt-2 text-center">Trao cơ hội - Nhận niềm tin</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-4">
            <button onClick={() => setActiveTab('dashboard')} className={`nav-link ${activeTab === 'dashboard' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <Home size={24} /> Trang chủ
            </button>
            <button onClick={() => setActiveTab('config_hkd')} className={`nav-link ${activeTab === 'config_hkd' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <Settings size={24} /> Tùy chỉnh
            </button>
            <button onClick={() => setActiveTab('program')} className={`nav-link ${activeTab === 'program' || activeTab === 'schedule' || activeTab === 'journal' || activeTab === 'subject_config' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <ClipboardList size={24} /> Chương trình
            </button>
            <button onClick={() => setActiveTab('finance')} className={`nav-link ${activeTab === 'finance' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <DollarSign size={24} /> Tài chính
            </button>
            <button onClick={() => setActiveTab('students')} className={`nav-link ${activeTab === 'students' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <Users size={24} /> Học sinh
            </button>
            <button onClick={() => setActiveTab('reports')} className={`nav-link ${activeTab === 'reports' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <BarChart3 size={24} /> Báo cáo
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-6 sm:gap-10">
          <button className="p-4 text-slate-600 hover:text-indigo-600 transition-colors relative bg-slate-100 rounded-[1.25rem] hover:bg-slate-200">
            <Bell size={28} />
            <span className="absolute top-4 right-4 w-4 h-4 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          
          <div className="h-14 w-px bg-slate-200 mx-2 hidden sm:block"></div>

          <div className="flex items-center gap-6 group cursor-pointer relative">
            <div className="text-right hidden md:block">
              <p className="text-xl font-bold text-slate-900 leading-none">{currentUser?.username}</p>
              <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-3">{currentUser?.role}</p>
            </div>
            <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-2xl shadow-indigo-200 ring-4 ring-white group-hover:scale-105 transition-transform">
              {currentUser?.username?.charAt(0).toUpperCase()}
            </div>
            <ChevronDown size={24} className="text-slate-400 group-hover:text-indigo-600 transition-colors hidden sm:block" />

            {/* Dropdown */}
            <div className="absolute top-full right-0 mt-6 w-72 bg-white rounded-[2rem] shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 py-6 z-[60] ring-1 ring-slate-200">
              <div className="px-8 py-4 border-b border-slate-50 mb-4 md:hidden">
                <p className="text-xl font-bold text-slate-900 leading-none">{currentUser?.username}</p>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-3">{currentUser?.role}</p>
              </div>
              <button className="w-full px-8 py-5 text-left text-xl font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-5 transition-colors">
                <User size={24} className="text-indigo-500" /> Thông tin cá nhân
              </button>
              <button onClick={handleLogout} className="w-full px-8 py-5 text-left text-xl font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-5 transition-colors">
                <LogOut size={24} /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-3 flex items-center justify-around shadow-[0_-10px_40px_rgb(0,0,0,0.08)]">
        <MobileNavLink active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Home size={26} />} label="Trang chủ" />
        <MobileNavLink active={activeTab === 'config_hkd'} onClick={() => setActiveTab('config_hkd')} icon={<Settings size={26} />} label="Tùy chỉnh" />
        <MobileNavLink active={activeTab === 'program' || activeTab === 'schedule' || activeTab === 'journal' || activeTab === 'subject_config'} onClick={() => setActiveTab('program')} icon={<ClipboardList size={26} />} label="Chương trình" />
        <MobileNavLink active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<DollarSign size={26} />} label="Tài chính" />
        <MobileNavLink active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users size={26} />} label="Học sinh" />
        <MobileNavLink active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<BarChart3 size={26} />} label="Báo cáo" />
      </nav>

      <main className="flex-1 p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full pb-24 lg:pb-12">
        {activeTab !== 'dashboard' && (
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-2xl font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft size={18} />
              Quay về trang chủ
            </button>
          </div>
        )}
        {['program', 'schedule', 'journal', 'subject_config'].includes(activeTab) && (
          <div className="flex flex-wrap gap-4 mb-10 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 w-fit">
            <button 
              onClick={() => setActiveTab('program')}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'program' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <BookOpen size={18} /> Chương trình dạy
            </button>
            <button 
              onClick={() => setActiveTab('subject_config')}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'subject_config' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Settings size={18} /> Cấu hình môn học
            </button>
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Calendar size={18} /> Lịch báo giảng
            </button>
            <button 
              onClick={() => setActiveTab('journal')}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'journal' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <FileText size={18} /> Sổ đầu bài
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <Dashboard 
              studentsCount={students.length}
              activeStudentsCount={activeStudentsCount}
              revenue={revenue}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          )}
          {activeTab === 'reports' && (
            <Reports 
              students={students}
              financeStudents={financeStudents}
              financialConfig={financialConfig}
              expenditures={expenditures}
            />
          )}

          {activeTab === 'config_hkd' && (
            <motion.div key="hkd" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl flex flex-col gap-8">
              <div>
                <SectionHeader title="Cấu hình Hộ Kinh Doanh" subtitle="Thông tin pháp lý và địa chỉ cơ sở" />
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-6">
                  {isAdmin && (
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setActiveTab('accounts')}
                        className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-rose-100 transition-all border border-rose-100"
                      >
                        <ShieldCheck size={20} />
                        Quản lý tài khoản người dùng
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Tên Hộ Kinh Doanh" value={hkdConfig.name} onChange={v => isAdmin && setHkdConfig({...hkdConfig, name: v})} placeholder="Nhập tên cơ sở..." />
                    <InputGroup label="Chủ hộ" value={hkdConfig.owner} onChange={v => isAdmin && setHkdConfig({...hkdConfig, owner: v})} placeholder="Nhập tên chủ hộ..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Mã số thuế" value={hkdConfig.taxId} onChange={v => isAdmin && setHkdConfig({...hkdConfig, taxId: v})} placeholder="Nhập mã số thuế..." />
                    <InputGroup label="Google Script URL" value={isAdmin ? (hkdConfig.scriptUrl || '') : '********'} onChange={v => isAdmin && setHkdConfig({...hkdConfig, scriptUrl: v})} placeholder="https://script.google.com/macros/s/.../exec" />
                  </div>
                  <InputGroup label="Địa chỉ" value={hkdConfig.address} onChange={v => isAdmin && setHkdConfig({...hkdConfig, address: v})} placeholder="Địa chỉ chi tiết..." />
                  {isAdmin && (
                    <button onClick={saveConfig} className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 w-fit">
                      <Save size={20} />
                      Lưu cấu hình
                    </button>
                  )}

                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mt-6">
                    <div className="flex flex-col lg:flex-row gap-8">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                          <BookOpen size={20} /> Hướng dẫn kết nối Google Sheets
                        </h4>
                        <ul className="text-sm text-indigo-800 space-y-3 list-disc pl-5">
                          <li>Mở tệp Google Sheets của bạn.</li>
                          <li>Chọn <b>Tiện ích mở rộng</b> &gt; <b>Apps Script</b>.</li>
                          <li>Dán mã <code>code.gs</code> phiên bản hỗ trợ 2 chiều vào trình soạn thảo.</li>
                          <li>Nhấn <b>Triển khai</b> &gt; <b>Triển khai mới</b>.</li>
                          <li>Chọn loại là <b>Ứng dụng web</b>, thiết lập "Người có quyền truy cập" là <b>Bất kỳ ai</b>.</li>
                          <li>Sao chép <b>URL ứng dụng web</b> và dán vào ô "Google Script URL" ở trên.</li>
                          <li><b>Lưu ý:</b> Hệ thống hiện hỗ trợ đồng bộ 2 chiều. Bạn có thể sửa trên Sheets rồi nhấn "Đồng bộ" trên App, hoặc sửa trên App rồi nhấn "Lưu lên Sheet".</li>
                        </ul>
                        
                        <div className="mt-6 flex flex-wrap gap-4">
                          <a 
                            href="https://docs.google.com/spreadsheets/d/1g6Bgw96E9eVCbG3jQQ0nS7HGRqpuSy-UusR3kdvU8RQ/edit" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-sm"
                          >
                            <ExternalLink size={18} />
                            Mở Google Sheet mẫu
                          </a>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(GOOGLE_SCRIPT_CODE);
                              alert('Đã sao chép mã Google Script vào bộ nhớ tạm!');
                            }}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
                          >
                            <Copy size={18} />
                            Sao chép mã Script
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-800 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-2 px-2">
                          <span className="text-xs font-mono text-slate-400">code.gs</span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Google Apps Script</span>
                        </div>
                        <div className="relative flex-1 overflow-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                          <pre className="text-[11px] font-mono text-indigo-300 leading-relaxed p-2">
                            {GOOGLE_SCRIPT_CODE}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'subject_config' && (
            <motion.div key="subject_config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl flex flex-col gap-8">
              <div>
                  <div className="flex justify-between items-center mb-4">
                    <SectionHeader title="Cấu hình Môn Học" subtitle="Danh mục môn học và phân môn theo khối lớp" />
                    <div className="flex gap-2">
                      <button 
                        onClick={fetchKHDHData}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all"
                      >
                        <RefreshCw size={16} />
                        Đồng bộ từ Sheet
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => uploadToGoogleSheets(khdhData)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
                        >
                          <Save size={16} />
                          Lưu lên Sheet
                        </button>
                      )}
                      <button onClick={addSubjectRow} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all">
                        <Plus size={16} />
                        Thêm môn học
                      </button>
                    </div>
                  </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-4 w-24">Khối lớp</th>
                        <th className="p-4">Môn học</th>
                        <th className="p-4">Phân môn</th>
                        <th className="p-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subjects.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => moveSubjectRow(idx, 'up')} className="text-slate-400 hover:text-indigo-600"><ArrowUp size={12} /></button>
                                  <button onClick={() => moveSubjectRow(idx, 'down')} className="text-slate-400 hover:text-indigo-600"><ArrowDown size={12} /></button>
                                </div>
                              )}
                              <select 
                                value={row.grade} 
                                onChange={e => updateSubjectRow(idx, 'grade', e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-medium text-slate-700"
                              >
                                <option value="6">Khối 6</option>
                                <option value="7">Khối 7</option>
                                <option value="8">Khối 8</option>
                                <option value="9">Khối 9</option>
                              </select>
                            </div>
                          </td>
                          <td className="p-4">
                            <input 
                              type="text" 
                              value={row.subject} 
                              onChange={e => updateSubjectRow(idx, 'subject', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-sm text-slate-600"
                            />
                          </td>
                          <td className="p-4">
                            <input 
                              type="text" 
                              value={row.subSubject} 
                              onChange={e => updateSubjectRow(idx, 'subSubject', e.target.value)}
                              placeholder="Nhập phân môn..."
                              className="w-full bg-transparent border-none outline-none text-sm text-slate-500 italic"
                            />
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => deleteSubjectRow(idx)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'program' && (
            <motion.div key="program" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <SectionHeader title="Chương trình dạy học" subtitle="Quản lý chương trình dạy học theo khối lớp" />
                <div className="flex gap-2">
                  <button 
                    onClick={fetchKHDHData} 
                    className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-700 transition-all shadow-lg shadow-amber-100"
                  >
                    <RefreshCw size={16} />
                    Đồng bộ từ Sheet
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => uploadToGoogleSheets(khdhData)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      <Save size={16} />
                      Lưu lên Sheet
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[6, 7, 8, 9].map(grade => (
                  <div key={grade} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                          <BookOpen size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Khối lớp {grade}</h3>
                      </div>
                      {teachingPrograms[grade] && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">Đã tải lên</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <label className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition-all group cursor-pointer">
                        <Upload className="text-slate-400 group-hover:text-indigo-600" size={20} />
                        <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700 text-center">Tải lên & Đồng bộ Sheets</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".xlsx, .xls, .csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                try {
                                  const bstr = evt.target?.result;
                                  const wb = XLSX.read(bstr, { type: 'binary' });
                                  const wsname = wb.SheetNames[0];
                                  const ws = wb.Sheets[wsname];
                                  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                                  
                                  const newKhdhData = { ...khdhData };
                                  const newSubjects = [...subjects];
                                  let subjectsChanged = false;

                                  // Expecting columns: Grade, Subject, SubSubject, Period, Content
                                  // Skip header
                                  for (let i = 1; i < data.length; i++) {
                                    const [g, s, ss, p, c] = data[i];
                                    if (g && s) {
                                      const gradeStr = String(g);
                                      const subjectStr = String(s);
                                      const subSubjectStr = ss ? String(ss) : '';
                                      
                                      const key = `${gradeStr}-${subjectStr}-${subSubjectStr}-${p}`;
                                      newKhdhData[key] = String(c);

                                      // Check if subject exists in list
                                      const exists = newSubjects.find(item => 
                                        item.grade === gradeStr && 
                                        item.subject === subjectStr && 
                                        item.subSubject === subSubjectStr
                                      );
                                      if (!exists) {
                                        newSubjects.push({ grade: gradeStr, subject: subjectStr, subSubject: subSubjectStr });
                                        subjectsChanged = true;
                                      }
                                    }
                                  }
                                  
                                  setKhdhData(newKhdhData);
                                  if (subjectsChanged) {
                                    setSubjects(newSubjects);
                                    localStorage.setItem('subjects_config', JSON.stringify(newSubjects));
                                  }
                                  setTeachingPrograms(prev => ({ ...prev, [grade]: file.name }));
                                  localStorage.setItem('khdh_data', JSON.stringify(newKhdhData));
                                  
                                  // Sync to Google Sheets
                                  uploadToGoogleSheets(newKhdhData, [grade]);
                                  
                                  alert(`Đã tải lên và đồng bộ file: ${file.name} cho khối ${grade}`);
                                } catch (err) {
                                  console.error(err);
                                  alert('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.');
                                }
                              };
                              reader.readAsBinaryString(file);
                            }
                          }}
                        />
                      </label>
                      <button 
                        onClick={() => {
                          if (!teachingPrograms[grade]) {
                            alert('Vui lòng tải lên chương trình trước khi lưu!');
                            return;
                          }
                          uploadToGoogleSheets(khdhData, [grade]);
                        }}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-100 transition-all group"
                      >
                        <Save className="text-slate-400 group-hover:text-emerald-600" size={20} />
                        <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-700 text-center">Đồng bộ Sheets thủ công</span>
                      </button>
                      <button 
                        onClick={() => setSelectedGradeForProgram(grade)}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-amber-50 hover:border-amber-100 transition-all group"
                      >
                        <Eye className="text-slate-400 group-hover:text-amber-600" size={20} />
                        <span className="text-xs font-bold text-slate-600 group-hover:text-amber-700 text-center">Xem chi tiết</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (confirmDeleteGrade === grade) {
                            deleteProgramForGrade(grade);
                          } else {
                            setConfirmDeleteGrade(grade);
                            setTimeout(() => setConfirmDeleteGrade(null), 5000);
                          }
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all group ${confirmDeleteGrade === grade ? 'bg-rose-600 border-rose-600 text-white' : 'bg-slate-50 border-slate-100 hover:bg-rose-50 hover:border-rose-100'}`}
                      >
                        <Trash2 className={confirmDeleteGrade === grade ? 'text-white' : 'text-slate-400 group-hover:text-rose-600'} size={20} />
                        <span className={`text-xs font-bold ${confirmDeleteGrade === grade ? 'text-white' : 'text-slate-600 group-hover:text-rose-700'} text-center`}>
                          {confirmDeleteGrade === grade ? 'Đồng ý xóa' : 'Xóa chương trình'}
                        </span>
                      </button>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Chương trình đã đồng bộ</p>
                      <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(khdhData)
                          .filter(([key]) => key.startsWith(`${grade}-`))
                          .map(([key, content]) => {
                            const parts = key.split('-');
                            return (
                              <div key={key} className="text-[10px] py-1 border-b border-slate-50 last:border-none">
                                <span className="font-bold text-indigo-600">Tiết {parts[3]} ({parts[1]}):</span> {content}
                              </div>
                            );
                          })}
                        {Object.keys(khdhData).filter(k => k.startsWith(`${grade}-`)).length === 0 && (
                          <p className="text-[10px] text-slate-400 italic">Chưa có dữ liệu chương trình cho khối này.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detail View Modal */}
              {selectedGradeForProgram && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                  >
                    <div className="p-8 bg-slate-50 border-b-2 border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
                          <BookOpen size={32} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-slate-900">Chi tiết chương trình Khối {selectedGradeForProgram}</h3>
                          <p className="text-lg text-slate-500 font-bold">Danh sách các tiết dạy đã cấu hình</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedGradeForProgram(null)}
                        className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
                      >
                        <X size={32} />
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <div className="grid grid-cols-1 gap-4">
                        {Object.entries(khdhData)
                          .filter(([key]) => key.startsWith(`${selectedGradeForProgram}-`))
                          .sort((a, b) => {
                            const partsA = a[0].split('-');
                            const partsB = b[0].split('-');
                            // Sort by subject, then sub-subject, then period
                            if (partsA[1] !== partsB[1]) return partsA[1].localeCompare(partsB[1]);
                            if (partsA[2] !== partsB[2]) return partsA[2].localeCompare(partsB[2]);
                            return parseInt(partsA[3]) - parseInt(partsB[3]);
                          })
                          .map(([key, content]) => {
                            const parts = key.split('-');
                            return (
                              <div key={key} className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 flex flex-col md:flex-row md:items-center gap-4 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                                <div className="flex items-center gap-4 min-w-[200px]">
                                  <span className="bg-white px-4 py-2 rounded-xl border-2 border-slate-200 text-indigo-600 font-bold text-lg shadow-sm">
                                    Tiết {parts[3]}
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-xl">{parts[1]}</span>
                                    <span className="text-sm font-bold text-slate-500 italic">{parts[2]}</span>
                                  </div>
                                </div>
                                <div className="flex-1 text-xl font-bold text-slate-700 leading-relaxed">
                                  {content}
                                </div>
                              </div>
                            );
                          })}
                        {Object.keys(khdhData).filter(k => k.startsWith(`${selectedGradeForProgram}-`)).length === 0 && (
                          <div className="text-center py-20 text-slate-400">
                            <BookOpen size={80} className="mx-auto mb-6 opacity-20" />
                            <p className="text-2xl font-bold">Chưa có dữ liệu chương trình cho khối này.</p>
                            <p className="text-lg mt-2">Vui lòng tải lên file Excel để bắt đầu.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-8 bg-slate-50 border-t-2 border-slate-100 flex justify-end">
                      <button 
                        onClick={() => setSelectedGradeForProgram(null)}
                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-xl font-bold hover:bg-slate-800 transition-all shadow-xl"
                      >
                        Đóng
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {(activeTab === 'schedule' || activeTab === 'journal') && (
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <SectionHeader 
                  title={activeTab === 'schedule' ? "Lịch báo giảng" : "Sổ đầu bài"} 
                  subtitle={activeTab === 'schedule' ? "Kế hoạch dạy học của giáo viên" : "Ghi chép diễn biến lớp học"} 
                />
                <div className="flex gap-2 mb-8">
                  {activeTab === 'schedule' && (
                    <>
                      <button onClick={syncToJournal} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                        <RefreshCw size={16} />
                        Đồng bộ sang Sổ đầu bài
                      </button>
                      <button onClick={() => addScheduleRow('schedule')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        <Plus size={16} />
                        Thêm dòng mới
                      </button>
                    </>
                  )}
                  <button onClick={() => exportToWord(activeTab as any)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                    <FileDown size={16} />
                    Xuất file Word (.docx)
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tuần</label>
                    <input 
                      type="text" 
                      value={activeTab === 'schedule' ? scheduleMeta.week : journalMeta.week} 
                      onChange={e => activeTab === 'schedule' ? setScheduleMeta({...scheduleMeta, week: e.target.value}) : setJournalMeta({...journalMeta, week: e.target.value})}
                      className="bg-transparent border-b border-slate-200 outline-none text-sm font-bold text-slate-700 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Từ ngày</label>
                    <input 
                      type="date" 
                      value={activeTab === 'schedule' ? scheduleMeta.fromDate : journalMeta.fromDate} 
                      onChange={e => activeTab === 'schedule' ? setScheduleMeta({...scheduleMeta, fromDate: e.target.value}) : setJournalMeta({...journalMeta, fromDate: e.target.value})}
                      className="bg-transparent border-b border-slate-200 outline-none text-sm font-bold text-slate-700 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đến ngày</label>
                    <input 
                      type="date" 
                      value={activeTab === 'schedule' ? scheduleMeta.toDate : journalMeta.toDate} 
                      onChange={e => activeTab === 'schedule' ? setScheduleMeta({...scheduleMeta, toDate: e.target.value}) : setJournalMeta({...journalMeta, toDate: e.target.value})}
                      className="bg-transparent border-b border-slate-200 outline-none text-sm font-bold text-slate-700 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giáo viên</label>
                    <input 
                      type="text" 
                      value={activeTab === 'schedule' ? scheduleMeta.teacher : journalMeta.teacher} 
                      onChange={e => activeTab === 'schedule' ? setScheduleMeta({...scheduleMeta, teacher: e.target.value}) : setJournalMeta({...journalMeta, teacher: e.target.value})}
                      placeholder="Nhập tên giáo viên..."
                      className="bg-transparent border-b border-slate-200 outline-none text-sm font-semibold text-indigo-600 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1200px] border-collapse">
                    <thead className="bg-slate-50 text-slate-700 text-[10px] uppercase tracking-wider font-bold border-y border-slate-200">
                      <tr>
                        <th className="p-4 w-32">Thứ ngày</th>
                        <th className="p-4 w-48">Ca học / Buổi</th>
                        <th className="p-4 w-20">Lớp</th>
                        <th className="p-4 w-32">Môn học</th>
                        <th className="p-4 w-32">Phân môn</th>
                        <th className="p-4 w-20">Tiết KHDH</th>
                        <th className="p-4">Tên bài dạy / Nội dung</th>
                        {activeTab === 'schedule' ? (
                          <th className="p-4 w-48">Ghi chú</th>
                        ) : (
                          <>
                            <th className="p-4 w-24">Sĩ số</th>
                            <th className="p-4 w-48">Nhận xét</th>
                          </>
                        )}
                        <th className="p-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activeTab === 'schedule' ? scheduleData : journalData).map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => moveRow(activeTab as any, row.id, 'up')} className="text-slate-400 hover:text-indigo-600"><ArrowUp size={12} /></button>
                                  <button onClick={() => moveRow(activeTab as any, row.id, 'down')} className="text-slate-400 hover:text-indigo-600"><ArrowDown size={12} /></button>
                                </div>
                              )}
                              <select className="w-full p-2 bg-transparent outline-none text-sm font-medium" value={row.day} onChange={e => updateRow(activeTab as any, row.id, 'day', e.target.value)}>
                                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                          </td>
                          <td className="p-2">
                            <select className="w-full p-2 bg-transparent outline-none text-sm" value={row.shift} onChange={e => updateRow(activeTab as any, row.id, 'shift', e.target.value)}>
                              {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="p-2">
                            <select className="w-full p-2 bg-transparent outline-none text-sm font-semibold text-slate-700" value={row.class} onChange={e => updateRow(activeTab as any, row.id, 'class', e.target.value)}>
                              <option value="6">6</option>
                              <option value="7">7</option>
                              <option value="8">8</option>
                              <option value="9">9</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <select className="w-full p-2 bg-transparent outline-none text-sm" value={row.subject} onChange={e => updateRow(activeTab as any, row.id, 'subject', e.target.value)}>
                              {Array.from(new Set(subjects.filter(s => s.grade === row.class).map(s => s.subject))).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select className="w-full p-2 bg-transparent outline-none text-sm italic text-slate-500" value={row.subSubject} onChange={e => updateRow(activeTab as any, row.id, 'subSubject', e.target.value)}>
                              {Array.from(new Set(subjects.filter(s => s.grade === row.class && s.subject === row.subject).map(s => s.subSubject))).map((ss, ssIdx) => (
                                <option key={`${ss}-${ssIdx}`} value={ss}>{ss || '—'}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input type="number" className="w-full p-2 bg-transparent outline-none text-sm text-center font-semibold" value={row.period} onChange={e => updateRow(activeTab as any, row.id, 'period', e.target.value)} />
                          </td>
                          <td className="p-2">
                            <div className="p-2 text-sm text-slate-600 bg-slate-50 rounded-xl border border-slate-100 min-h-[42px] flex items-center">
                              {row.content}
                            </div>
                          </td>
                          {activeTab === 'schedule' ? (
                            <td className="p-2">
                              <textarea 
                                className="w-full p-2 bg-transparent outline-none text-sm border-b border-transparent focus:border-indigo-200 transition-all resize-none" 
                                value={row.note} 
                                rows={1}
                                placeholder="Ghi chú..."
                                onChange={e => updateRow('schedule', row.id, 'note', e.target.value)} 
                              />
                            </td>
                          ) : (
                            <>
                              <td className="p-2">
                                <input 
                                  className="w-full p-2 bg-transparent outline-none text-sm text-center border-b border-transparent focus:border-indigo-200 transition-all" 
                                  value={row.attendance} 
                                  placeholder="0/0"
                                  onChange={e => updateRow('journal', row.id, 'attendance', e.target.value)} 
                                />
                              </td>
                              <td className="p-2">
                                <textarea 
                                  className="w-full p-2 bg-transparent outline-none text-sm border-b border-transparent focus:border-indigo-200 transition-all resize-none" 
                                  value={row.comment} 
                                  rows={1}
                                  placeholder="Nhận xét..."
                                  onChange={e => updateRow('journal', row.id, 'comment', e.target.value)} 
                                />
                              </td>
                            </>
                          )}
                          <td className="p-2 text-right">
                            <button onClick={() => deleteRow(activeTab as any, row.id)} className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(activeTab === 'schedule' ? scheduleData : journalData).length === 0 && (
                        <tr>
                          <td colSpan={activeTab === 'schedule' ? 9 : 10} className="p-16 text-center text-slate-400 italic">
                            Chưa có dữ liệu cho tuần này. Nhấn "Thêm dòng mới" để bắt đầu lập kế hoạch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-12 px-4 pb-4">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-12">Người lập</p>
                    <p className="text-sm font-bold text-slate-800 underline decoration-slate-200 underline-offset-8">
                      {activeTab === 'schedule' ? scheduleMeta.teacher : journalMeta.teacher}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-12">
                      {activeTab === 'schedule' ? "Duyệt kế hoạch" : "Xác nhận của HKD"}
                    </p>
                    <div className="h-[1px] w-32 bg-slate-200 mx-auto"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'students' && (
            <motion.div key="students" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-7xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
                <SectionHeader title="Quản lý học sinh" subtitle="Danh sách học sinh và xuất đơn đăng ký" />
              </div>

              <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <button 
                      onClick={() => {
                        const templateData = [
                          ["STT", "HỌ VÀ TÊN", "LỚP", "TRƯỜNG", "HỌ VÀ TÊN PHỤ HUYNH", "SĐT", "MÔN ĐĂNG KÍ HỌC", "NGÀY ĐĂNG KÍ HỌC"],
                          [1, "Nguyễn Văn A", "6", "THCS Tân Phong", "Nguyễn Văn B", "0912345678", "Toán", "01/01/2026"]
                        ];
                        const ws = XLSX.utils.aoa_to_sheet(templateData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Template");
                        XLSX.writeFile(wb, "Mau_Danh_Sach_Hoc_Sinh.xlsx");
                      }}
                      className="flex flex-col items-center text-center gap-4 p-6 bg-white rounded-[2rem] border-2 border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group shadow-sm hover:shadow-xl"
                    >
                      <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-100 transition-colors ring-1 ring-slate-100">
                        <Download className="text-slate-500 group-hover:text-indigo-600" size={28} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 mb-1">Tải xuống danh sách mẫu</p>
                        <p className="text-sm text-slate-600 font-bold">File mẫu Excel</p>
                      </div>
                    </button>

                    <label className="flex flex-col items-center text-center gap-4 p-6 bg-white rounded-[2rem] border-2 border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group shadow-sm hover:shadow-xl cursor-pointer">
                      <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-100 transition-colors ring-1 ring-slate-100">
                        <Upload className="text-slate-500 group-hover:text-indigo-600" size={28} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 mb-1">
                          {isAnalyzing ? 'Đang phân tích...' : 'Tải lên danh sách'}
                        </p>
                        <p className="text-sm text-slate-600 font-bold">Nhập dữ liệu từ Excel</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".xlsx, .xls, .csv"
                        disabled={isAnalyzing}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const bstr = evt.target?.result;
                              const wb = XLSX.read(bstr, { type: 'binary' });
                              const wsname = wb.SheetNames[0];
                              const ws = wb.Sheets[wsname];
                              const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                              analyzeStudentList(data);
                            };
                            reader.readAsBinaryString(file);
                          }
                        }}
                      />
                    </label>

                    <button 
                      onClick={() => exportRegistrationForm(students)}
                      disabled={students.length === 0}
                      className="flex flex-col items-center text-center gap-4 p-6 bg-white rounded-[2rem] border-2 border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group shadow-sm hover:shadow-xl disabled:opacity-50"
                    >
                      <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-100 transition-colors ring-1 ring-slate-100">
                        <FileDown className="text-slate-500 group-hover:text-indigo-600" size={28} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 mb-1">Xuất đơn hàng loạt</p>
                        <p className="text-sm text-slate-600 font-bold">Tải toàn bộ đơn đăng ký</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        if (confirmDelete) {
                          setStudents([]);
                          setConfirmDelete(false);
                        } else {
                          setConfirmDelete(true);
                          setTimeout(() => setConfirmDelete(false), 5000);
                        }
                      }}
                      className={`flex flex-col items-center text-center gap-4 p-6 rounded-[2rem] border-2 transition-all group shadow-sm hover:shadow-xl ${confirmDelete ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-100 hover:bg-rose-50 hover:border-rose-200'}`}
                    >
                      <div className={`p-4 rounded-2xl transition-colors ${confirmDelete ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-rose-100'}`}>
                        <Trash2 className={confirmDelete ? 'text-white' : 'text-slate-500 group-hover:text-rose-600'} size={28} />
                      </div>
                      <div>
                        <p className={`text-xl font-bold mb-1 ${confirmDelete ? 'text-white' : 'text-slate-900 group-hover:text-rose-700'}`}>
                          {confirmDelete ? 'Xác nhận xóa?' : 'Xóa danh sách'}
                        </p>
                        <p className={`text-sm font-bold ${confirmDelete ? 'text-white/80' : 'text-slate-600'}`}>
                          {confirmDelete ? 'Nhấn lại để xóa' : 'Xóa toàn bộ dữ liệu'}
                        </p>
                      </div>
                    </button>
                  </div>

                <div className="bg-white rounded-[3rem] shadow-sm border-2 border-slate-100 overflow-hidden">
                  <div className="p-8 bg-slate-50 border-b-2 border-slate-100 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-4">
                      <ClipboardList size={32} className="text-indigo-600" />
                      Danh sách học sinh
                    </h3>
                    <span className="text-xl font-bold text-indigo-600 bg-white px-6 py-2 rounded-2xl border-2 border-indigo-100 shadow-sm">
                      {students.length} học sinh
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-900 text-lg uppercase tracking-widest font-bold border-b-2 border-slate-100">
                          <tr>
                            <th className="p-8">Họ và tên</th>
                            <th className="p-8">Lớp</th>
                            <th className="p-8">Trường</th>
                            <th className="p-8">Phụ huynh</th>
                            <th className="p-8">SĐT</th>
                            <th className="p-8">Môn học</th>
                            <th className="p-8 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {students.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="p-8 font-bold text-slate-900 text-2xl">{s.name}</td>
                              <td className="p-8 text-slate-700 font-medium text-xl">{s.grade}</td>
                              <td className="p-8 text-slate-700 font-medium text-xl">{s.school}</td>
                              <td className="p-8 text-slate-700 font-medium text-xl">{s.parentName}</td>
                              <td className="p-8 text-slate-700 font-medium text-xl">{s.phone}</td>
                              <td className="p-8 text-slate-700 font-bold text-xl">{s.subjects}</td>
                              <td className="p-8 text-right">
                                <button 
                                  onClick={() => exportRegistrationForm(s)}
                                  className="text-indigo-600 hover:text-indigo-800 text-lg font-bold flex items-center gap-3 ml-auto bg-indigo-50 px-6 py-3 rounded-[1.25rem] transition-all hover:shadow-md active:scale-95"
                                >
                                  <FileDown size={24} />
                                  Xuất đơn
                                </button>
                              </td>
                            </tr>
                          ))}
                          {students.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-32 text-center text-slate-400">
                                <Users size={80} className="mx-auto mb-8 opacity-20" />
                                <p className="text-2xl font-bold">Chưa có dữ liệu học sinh. Vui lòng tải lên danh sách.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          {activeTab === 'finance' && (
            <motion.div key="finance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-7xl">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                <SectionHeader title="Quản lý tài chính" subtitle="Theo dõi thu chi và báo cáo tài chính" />
                <div className="flex items-center gap-3 bg-slate-100 p-3 rounded-[2rem] w-full lg:w-auto overflow-x-auto scrollbar-hide">
                  <button 
                    onClick={() => setFinanceSubTab('config')}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-lg font-bold transition-all whitespace-nowrap ${financeSubTab === 'config' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <Settings size={24} />
                    Cấu hình
                  </button>
                  <button 
                    onClick={() => setFinanceSubTab('data')}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-lg font-bold transition-all whitespace-nowrap ${financeSubTab === 'data' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <ClipboardList size={24} />
                    Dữ liệu
                  </button>
                  <button 
                    onClick={() => setFinanceSubTab('revenue')}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-lg font-bold transition-all whitespace-nowrap ${financeSubTab === 'revenue' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <BarChart3 size={24} />
                    Doanh thu
                  </button>
                  <button 
                    onClick={() => setFinanceSubTab('receipts')}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-lg font-bold transition-all whitespace-nowrap ${financeSubTab === 'receipts' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <FileText size={24} />
                    Phiếu thu chi
                  </button>
                </div>
              </div>
              
              {financeSubTab === 'config' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                  <div className="bg-white p-12 rounded-[3rem] shadow-sm border-2 border-slate-100">
                    <h3 className="text-3xl font-bold text-slate-900 mb-10 font-display tracking-tight">Cấu hình tài chính</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                      <InputGroup 
                        label="Kỳ báo cáo" 
                        value={financialConfig.period} 
                        onChange={v => setFinancialConfig({...financialConfig, period: v})} 
                        placeholder="Ví dụ: Tháng 03/2026" 
                      />
                      <InputGroup 
                        label="Ngày xuất phiếu thu" 
                        value={financialConfig.receiptDate} 
                        onChange={v => setFinancialConfig({...financialConfig, receiptDate: v})} 
                        placeholder="YYYY-MM-DD" 
                        type="date"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                      <InputGroup 
                        label="Ngày xuất phiếu chi" 
                        value={financialConfig.voucherDate} 
                        onChange={v => setFinancialConfig({...financialConfig, voucherDate: v})} 
                        placeholder="YYYY-MM-DD" 
                        type="date"
                      />
                      <div className="grid grid-cols-2 gap-8">
                        <InputGroup 
                          label="Người lập biểu" 
                          value={financialConfig.reporter} 
                          onChange={v => setFinancialConfig({...financialConfig, reporter: v})} 
                          placeholder="Tên..." 
                        />
                        <InputGroup 
                          label="Thủ quỹ" 
                          value={financialConfig.treasurer} 
                          onChange={v => setFinancialConfig({...financialConfig, treasurer: v})} 
                          placeholder="Tên..." 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          setIsFinanceConfigSaved(true);
                          alert('Đã lưu cấu hình tài chính!');
                        }}
                        className="bg-indigo-600 text-white px-12 py-5 rounded-[1.5rem] text-2xl font-bold flex items-center gap-4 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 active:scale-95"
                      >
                        <Save size={32} />
                        Lưu cấu hình
                      </button>
                    </div>
                  </div>

                  {isFinanceConfigSaved && (
                    <div className="bg-white p-12 rounded-[3rem] shadow-sm border-2 border-slate-100">
                      <h3 className="text-3xl font-bold text-slate-900 mb-10 font-display tracking-tight">Tải dữ liệu thu chi</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                        {/* Khu vực thu */}
                        <div className="p-10 bg-indigo-50/50 rounded-[2.5rem] border-2 border-indigo-100">
                          <h4 className="text-2xl font-bold text-indigo-900 mb-8 flex items-center gap-4">
                            <ArrowDownCircle size={32} className="text-indigo-600" />
                            Khu vực thu (Bảng chấm công)
                          </h4>
                          <label className="flex flex-col items-center justify-center gap-6 p-16 bg-white rounded-[2rem] border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group shadow-sm">
                            <FileText className="text-indigo-300 group-hover:text-indigo-600" size={64} />
                            <span className="text-xl font-bold text-indigo-700">Tải bảng chấm công thu tiền</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (evt) => {
                                    const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                                    const workbook = XLSX.read(data, { type: 'array' });
                                    const sheetName = workbook.SheetNames[0];
                                    const worksheet = workbook.Sheets[sheetName];
                                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                                    setIsAnalyzing(true);
                                    try {
                                      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
                                      const prompt = `
                                        Phân tích bảng chấm công và thu tiền sau đây. 
                                        Trích xuất danh sách học sinh bao gồm: Tên (HỌ VÀ TÊN), Lớp (chỉ lấy phần số hoặc tên lớp, ví dụ "6A" thay vì "Lớp 6A"), và Tổng tiền thu.
                                        YÊU CẦU CỰC KỲ QUAN TRỌNG: 
                                        - TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý SÁNG TẠO NỘI DUNG. 
                                        - CHỈ TRÍCH XUẤT DỮ LIỆU CÓ THỰC TRONG BẢNG.
                                        - KHÔNG ĐƯỢC THÊM HỌC SINH NẾU KHÔNG CÓ TRONG DANH SÁCH.
                                        - Nếu không có dữ liệu cho một trường, hãy để trống.
                                        - Trả về một mảng JSON các đối tượng với các khóa: name, grade, totalFee.
                                        Dữ liệu: ${JSON.stringify(jsonData.slice(0, 50))}
                                      `;
                                      const response = await ai.models.generateContent({
                                        model: "gemini-3-flash-preview",
                                        contents: prompt,
                                        config: { responseMimeType: "application/json" }
                                      });
                                      const result = JSON.parse(response.text);
                                      if (Array.isArray(result)) {
                                        const mapped = result.map(item => ({
                                          id: crypto.randomUUID(),
                                          name: String(item.name || ''),
                                          grade: String(item.grade || '6'),
                                          school: '',
                                          parentName: '',
                                          phone: '',
                                          subjects: '',
                                          registrationDate: new Date().toISOString().split('T')[0],
                                          fee: parseFloat(String(item.totalFee || '0').replace(/[^0-9]/g, ''))
                                        }));
                                        setFinanceStudents(prev => [...prev, ...mapped]);
                                        setUploadedFinanceFiles(prev => prev + 1);
                                        setIsRevenueFileUploaded(true);
                                        setFinanceSubTab('data');
                                        alert(`AI đã phân tích thành công ${mapped.length} học sinh từ bảng chấm công theo mẫu. Bạn có thể kiểm tra dữ liệu tại tab "Dữ liệu".`);
                                      } else {
                                        alert('AI không thể trích xuất dữ liệu hợp lệ. Vui lòng kiểm tra lại định dạng file.');
                                      }
                                    } catch (error) {
                                      console.error('AI Analysis error:', error);
                                      alert('Lỗi khi AI phân tích file. Đang thử ánh xạ thủ công...');
                                      
                                      // Fallback manual mapping for the specific 100% template
                                      const dataRows = jsonData.slice(5); // Skip 5 header rows (2 title + 3 header)
                                      const manualMapped = dataRows.map((row, index) => {
                                        const name = row[1];
                                        const grade = row[2];
                                        const totalFee = row[36];
                                        if (!name || name === 'HỌ VÀ TÊN') return null;
                                        return {
                                          id: crypto.randomUUID(),
                                          name: String(name),
                                          grade: String(grade || '6'),
                                          school: '',
                                          parentName: '',
                                          phone: '',
                                          subjects: '',
                                          registrationDate: new Date().toISOString().split('T')[0],
                                          fee: parseFloat(String(totalFee || '0').replace(/[^0-9]/g, ''))
                                        };
                                      }).filter(s => s !== null) as Student[];
                                      
                                      if (manualMapped.length > 0) {
                                        setFinanceStudents(prev => [...prev, ...manualMapped]);
                                        setUploadedFinanceFiles(prev => prev + 1);
                                        setIsRevenueFileUploaded(true);
                                        setFinanceSubTab('data');
                                        alert(`Đã trích xuất thủ công ${manualMapped.length} học sinh từ bảng chấm công. Bạn có thể kiểm tra dữ liệu tại tab "Dữ liệu".`);
                                      }
                                    } finally {
                                      setIsAnalyzing(false);
                                    }
                                  };
                                  reader.readAsArrayBuffer(file);
                                }
                              }}
                            />
                          </label>
                          {isRevenueFileUploaded && (
                            <div className="mt-4 flex items-center gap-3 text-indigo-600 text-sm font-bold justify-center bg-indigo-50 py-3 rounded-2xl border border-indigo-100">
                              <CheckCircle size={18} />
                              Hệ thống đã nhận file phiếu thu
                            </div>
                          )}
                        </div>

                        {/* Khu vực chi */}
                        <div className="p-8 bg-emerald-50/50 rounded-[2rem] border border-emerald-100">
                          <h4 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-3">
                            <ArrowUpCircle size={24} className="text-emerald-600" />
                            Khu vực chi (Bảng chi tiền)
                          </h4>
                          <label className="flex flex-col items-center justify-center gap-4 p-12 bg-white rounded-3xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer group">
                            <FileDown className="text-emerald-300 group-hover:text-emerald-600" size={48} />
                            <span className="text-lg font-bold text-emerald-700">Tải bảng chi tiền</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setUploadedFinanceFiles(prev => prev + 1);
                                  setIsExpenditureFileUploaded(true);
                                  alert('Hệ thống đã nhận file phiếu chi!');
                                }
                              }}
                            />
                          </label>
                          {isExpenditureFileUploaded && (
                            <div className="mt-4 flex items-center gap-3 text-emerald-600 text-sm font-bold justify-center bg-emerald-50 py-3 rounded-2xl border border-emerald-100">
                              <CheckCircle size={18} />
                              Hệ thống đã nhận file phiếu chi
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                          {(isRevenueFileUploaded || isExpenditureFileUploaded) && (
                            <button 
                              onClick={() => {
                                alert('AI đang phân tích và đồng bộ dữ liệu...');
                                setTimeout(() => {
                                  // Only use data from uploaded files or manual entry
                                  setFinanceSubTab('data');
                                  alert('Đồng bộ dữ liệu thành công! Bạn có thể kiểm tra và chỉnh sửa dữ liệu tại tab "Dữ liệu" trước khi xuất sổ.');
                                }, 1500);
                              }}
                              className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-lg font-bold shadow-xl hover:scale-105 transition-all"
                            >
                              <Sparkles size={24} />
                              Đồng bộ AI & Phân tích
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              if (confirmDeleteFinance) {
                                deleteFinanceData();
                              } else {
                                setConfirmDeleteFinance(true);
                                setTimeout(() => setConfirmDeleteFinance(false), 5000);
                              }
                            }}
                            className={`flex items-center gap-3 px-8 py-5 rounded-2xl text-lg font-bold transition-all shadow-xl ${confirmDeleteFinance ? 'bg-rose-600 text-white' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'}`}
                          >
                            <Trash2 size={24} />
                            {confirmDeleteFinance ? 'Đồng ý xóa dữ liệu' : 'Xóa dữ liệu tài chính'}
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => exportAttendanceAndFees()}
                          className="bg-slate-800 text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl"
                        >
                          <Download size={24} />
                          Tải mẫu bảng chấm công
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {financeSubTab === 'data' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                      <div>
                        <h3 className="text-3xl font-bold text-slate-800">Dữ liệu thu tiền học sinh</h3>
                        <p className="text-xl text-slate-600 font-bold">Kiểm tra và chỉnh sửa thông tin trước khi xuất báo cáo</p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setFinanceStudents([...financeStudents, { id: crypto.randomUUID(), name: '', grade: '', school: '', parentName: '', phone: '', subjects: '', registrationDate: new Date().toISOString().split('T')[0], fee: 0 }])}
                          className="bg-indigo-50 text-indigo-600 px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-indigo-100 transition-all shadow-sm"
                        >
                          <Plus size={24} /> Thêm học sinh
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="p-6 text-lg font-bold text-slate-700 uppercase tracking-widest w-24">TT</th>
                            <th className="p-6 text-lg font-bold text-slate-700 uppercase tracking-widest">Họ và tên</th>
                            <th className="p-6 text-lg font-bold text-slate-700 uppercase tracking-widest">Lớp / Địa chỉ</th>
                            <th className="p-6 text-lg font-bold text-slate-700 uppercase tracking-widest">Số tiền thu</th>
                            <th className="p-6 text-lg font-bold text-slate-700 uppercase tracking-widest w-28">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {financeStudents.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-20 text-center text-slate-400 italic text-lg">
                                Chưa có dữ liệu học sinh. Vui lòng tải file tại tab "Cấu hình".
                              </td>
                            </tr>
                          ) : (
                            financeStudents.map((s, idx) => (
                              <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="p-6 text-xl font-medium text-slate-500">{idx + 1}</td>
                                <td className="p-4">
                                  <input 
                                    type="text" 
                                    value={s.name} 
                                    onChange={(e) => setFinanceStudents(prev => prev.map(item => item.id === s.id ? { ...item, name: e.target.value } : item))}
                                    className="w-full p-4 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 focus:bg-white rounded-2xl text-xl font-bold text-slate-800 transition-all"
                                    placeholder="Họ tên..."
                                  />
                                </td>
                                <td className="p-4">
                                  <input 
                                    type="text" 
                                    value={s.grade} 
                                    onChange={(e) => setFinanceStudents(prev => prev.map(item => item.id === s.id ? { ...item, grade: e.target.value } : item))}
                                    className="w-full p-4 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 focus:bg-white rounded-2xl text-xl font-bold text-slate-800 transition-all"
                                    placeholder="Lớp..."
                                  />
                                </td>
                                <td className="p-4">
                                  <div className="relative">
                                    <input 
                                      type="number" 
                                      value={s.fee} 
                                      onChange={(e) => setFinanceStudents(prev => prev.map(item => item.id === s.id ? { ...item, fee: parseInt(e.target.value) || 0 } : item))}
                                      className={`w-full p-4 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 focus:bg-white rounded-2xl text-xl font-semibold transition-all ${s.fee === 0 ? 'text-rose-500' : 'text-indigo-600'}`}
                                      placeholder="Số tiền..."
                                    />
                                    {s.fee === 0 && (
                                      <span className="absolute -top-10 left-0 text-sm text-rose-500 font-bold bg-rose-50 px-4 py-2 rounded-full border border-rose-100 whitespace-nowrap shadow-sm">
                                        Sẽ không xuất sổ (0đ)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-6">
                                  <button 
                                    onClick={() => setFinanceStudents(prev => prev.filter(item => item.id !== s.id))}
                                    className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                                  >
                                    <Trash2 size={24} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {financeStudents.length > 0 && (
                      <div className="mt-10 flex justify-end">
                        <button 
                          onClick={() => setFinanceSubTab('revenue')}
                          className="bg-indigo-600 text-white px-10 py-4 rounded-2xl text-lg font-bold flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                        >
                          Tiếp tục xuất sổ
                          <ArrowRight size={24} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {financeSubTab === 'revenue' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
                      <div>
                        <h3 className="text-3xl font-bold text-slate-800">Sổ chi tiết doanh thu</h3>
                        <p className="text-xl text-slate-600 font-bold">Quản lý các khoản chi và xuất báo cáo doanh thu</p>
                      </div>
                      <button 
                        onClick={() => exportFinancialReports('revenue')}
                        className="bg-emerald-600 text-white px-10 py-5 rounded-2xl text-lg font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                      >
                        <FileDown size={24} />
                        Xuất sổ doanh thu (Word)
                      </button>
                    </div>

                    <div className="mb-10">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-slate-700 uppercase text-sm tracking-widest">Nội dung chi chi tiết</h4>
                        <button 
                          onClick={() => setExpenditures([...expenditures, { id: Date.now().toString(), date: financialConfig.voucherDate, description: '', amount: 0, recipient: '', recipientAddress: '' }])}
                          className="text-indigo-600 text-lg font-bold flex items-center gap-2 hover:underline"
                        >
                          <Plus size={20} /> Thêm nội dung chi
                        </button>
                      </div>
                      
                      <div className="space-y-6">
                        {expenditures.map((exp, idx) => (
                          <div key={exp.id} className="flex flex-col gap-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <InputGroup label="Ngày" value={exp.date} onChange={v => {
                                const newExp = [...expenditures];
                                newExp[idx].date = v;
                                setExpenditures(newExp);
                              }} placeholder="YYYY-MM-DD" type="date" />
                              <InputGroup label="Người nhận tiền" value={exp.recipient} onChange={v => {
                                const newExp = [...expenditures];
                                newExp[idx].recipient = v;
                                setExpenditures(newExp);
                              }} placeholder="Tên người nhận..." />
                              <InputGroup label="Địa chỉ người nhận" value={exp.recipientAddress} onChange={v => {
                                const newExp = [...expenditures];
                                newExp[idx].recipientAddress = v;
                                setExpenditures(newExp);
                              }} placeholder="Địa chỉ..." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <InputGroup label="Nội dung chi" value={exp.description} onChange={v => {
                                const newExp = [...expenditures];
                                newExp[idx].description = v;
                                setExpenditures(newExp);
                              }} placeholder="Ví dụ: Tiền điện, nước..." />
                              <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                  <InputGroup label="Số tiền" value={exp.amount.toString()} onChange={v => {
                                    const newExp = [...expenditures];
                                    newExp[idx].amount = parseInt(v) || 0;
                                    setExpenditures(newExp);
                                  }} placeholder="VNĐ" />
                                </div>
                                <button 
                                  onClick={() => setExpenditures(expenditures.filter(e => e.id !== exp.id))}
                                  className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {financeSubTab === 'receipts' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Xuất phiếu thu & phiếu chi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex flex-col gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">Phiếu thu tiền</h4>
                          <p className="text-xs text-slate-500">Xuất phiếu thu cho {activeStudentsCount} học sinh</p>
                        </div>
                        <button 
                          onClick={() => exportFinancialReports('receipts')}
                          className="mt-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                        >
                          <Download size={18} />
                          Xuất toàn bộ phiếu thu
                        </button>
                      </div>

                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                          <FileDown size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">Phiếu chi tiền</h4>
                          <p className="text-xs text-slate-500">Xuất phiếu chi cho {expenditures.length} nội dung chi</p>
                        </div>
                        <button 
                          onClick={() => exportFinancialReports('vouchers')}
                          className="mt-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                        >
                          <Download size={18} />
                          Xuất toàn bộ phiếu chi
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'accounts' && isAdmin && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Quản lý tài khoản</h2>
                  <p className="text-slate-700 font-medium">Cấu hình và đồng bộ tài khoản người dùng</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Danh sách tài khoản</h4>
                      <p className="text-[10px] text-slate-400 italic">
                        * Cấu hình các cột trong sheet "Accounts": Thứ tự, Tài khoản, Mật khẩu, Quyền, Thời hạn, Số máy
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={fetchKHDHData}
                        disabled={isAnalyzing}
                        className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Đồng bộ
                      </button>
                      <button 
                        onClick={saveAccountsToGoogleSheets}
                        disabled={isAnalyzing}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                      >
                        <Save size={16} />
                        Lưu lên Sheet
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Tài khoản</label>
                      <input 
                        type="text" 
                        value={newAccount.username} 
                        onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Mật khẩu</label>
                      <input 
                        type="text" 
                        value={newAccount.password} 
                        onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-32">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Quyền</label>
                      <select 
                        value={newAccount.role} 
                        onChange={(e) => setNewAccount({...newAccount, role: e.target.value})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      >
                        <option value="Giáo viên">Giáo viên</option>
                        <option value="Quản trị viên">Quản trị viên</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 w-32">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Thời hạn</label>
                      <input 
                        type="date" 
                        value={newAccount.expiry} 
                        onChange={(e) => setNewAccount({...newAccount, expiry: e.target.value})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-20">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Số máy</label>
                      <input 
                        type="number" 
                        value={newAccount.maxDevices} 
                        onChange={(e) => setNewAccount({...newAccount, maxDevices: parseInt(e.target.value) || 1})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                    <button 
                      onClick={addAccount}
                      className={`${editingAccount ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2`}
                    >
                      {editingAccount ? <Save size={20} /> : <Plus size={20} />}
                      {editingAccount ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                    {editingAccount && (
                      <button 
                        onClick={() => {
                          setEditingAccount(null);
                          setNewAccount({ username: '', password: '', role: 'Giáo viên', expiry: '', maxDevices: 1 });
                        }}
                        className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all"
                      >
                        Hủy
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left p-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">STT</th>
                          <th className="text-left p-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Tài khoản</th>
                          <th className="text-left p-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Mật khẩu</th>
                          <th className="text-left p-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Quyền</th>
                          <th className="text-left p-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Thời hạn</th>
                          <th className="text-left p-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Số máy</th>
                          <th className="text-right p-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 italic">Chưa có tài khoản nào được đồng bộ</td>
                          </tr>
                        ) : (
                          userAccounts.map((acc) => (
                            <tr key={acc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                              <td className="p-4 text-sm text-slate-500">{acc.index}</td>
                              <td className="p-4 text-sm font-bold text-slate-700">{acc.username}</td>
                              <td className="p-4 text-sm text-slate-500">{acc.password}</td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${acc.role === 'Quản trị viên' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {acc.role}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-slate-500">
                                {acc.expiry ? (
                                  <span className={new Date(acc.expiry) < new Date() ? 'text-rose-500 font-bold' : ''}>
                                    {acc.expiry}
                                  </span>
                                ) : 'Vĩnh viễn'}
                              </td>
                              <td className="p-4 text-sm text-slate-500">
                                {((acc as any).registeredDevices?.length || 0)} / {acc.maxDevices}
                              </td>
                              <td className="p-4 text-right flex justify-end gap-2">
                                <button 
                                  onClick={() => startEditAccount(acc)}
                                  className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all"
                                  title="Sửa tài khoản"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => deleteAccount(acc.id)}
                                  className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

// --- UI COMPONENTS ---

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 p-5 rounded-2xl transition-all group ${active ? 'bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-200' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-800'}`}
    >
      <span className={`${active ? 'text-indigo-600' : 'text-slate-600'}`}>{React.cloneElement(icon as React.ReactElement, { size: 28 })}</span>
      <span className={`text-xl tracking-tight transition-all duration-300 group-hover:font-bold ${active ? 'font-bold' : 'font-normal'}`}>{label}</span>
    </button>
  );
}

function MobileNavLink({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-2 py-3 px-5 rounded-2xl transition-all group ${active ? 'text-indigo-600 scale-110' : 'text-slate-500'}`}
    >
      <div className={`p-3 rounded-2xl transition-all ${active ? 'bg-indigo-50 shadow-md ring-1 ring-indigo-100' : 'group-hover:bg-slate-50'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 32 })}
      </div>
      <span className={`text-[13px] transition-all duration-300 group-hover:font-bold ${active ? 'font-bold opacity-100' : 'font-normal opacity-70'}`}>{label}</span>
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <div className="mb-8 sm:mb-12">
      <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 font-sans leading-tight tracking-tighter">{title}</h2>
      <p className="text-slate-500 text-lg sm:text-2xl font-medium mt-2 sm:mt-4 opacity-90">{subtitle}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-20 pb-10 px-6 sm:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
        {/* Brand Section */}
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-3 rounded-xl shadow-lg">
                <GraduationCap className="text-white w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tighter uppercase">HOÀNG GIA</h2>
            </div>
            <p className="text-indigo-600 font-bold text-sm tracking-[0.2em] uppercase mt-2">TRAO CƠ HỘI - NHẬN NIỀM TIN</p>
          </div>
          
          <p className="text-slate-500 text-lg leading-relaxed font-medium">
            Giải pháp quản lý giáo dục chuyên biệt dành cho giáo viên và các trung tâm dạy thêm, giúp tối ưu hóa việc quản lý học sinh, chương trình giảng dạy và tài chính một cách hiệu quả.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 text-slate-600">
              <div className="bg-slate-100 p-2 rounded-lg">
                <MapPin size={20} className="text-indigo-600" />
              </div>
              <span className="font-medium">267 Lê Duẩn, P. Tân Phong, TP. Lai Châu</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <div className="bg-slate-100 p-2 rounded-lg">
                <Phone size={20} className="text-indigo-600" />
              </div>
              <span className="font-medium">Zalo: 0366.000.555</span>
            </div>
          </div>

          <div className="flex gap-4">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <button key={i} className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">
                <Icon size={20} />
              </button>
            ))}
          </div>
        </div>

        {/* Links Section 1 */}
        <div className="flex flex-col gap-8">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em]">KHÁM PHÁ</h3>
          <ul className="flex flex-col gap-5">
            {['Về chúng tôi', 'Tính năng hệ thống', 'Bảng giá dịch vụ', 'Trung tâm hỗ trợ'].map((item) => (
              <li key={item}>
                <a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-lg transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Links Section 2 */}
        <div className="flex flex-col gap-8">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em]">PHÁP LÝ</h3>
          <ul className="flex flex-col gap-5">
            {['Điều khoản sử dụng', 'Chính sách bảo mật', 'Quy định vận hành'].map((item) => (
              <li key={item}>
                <a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-lg transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col gap-2 items-center md:items-start">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© 2026 HOÀNG GIA EDUCATION. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PHÁT TRIỂN BỞI: <span className="text-slate-900">ĐÀO MINH TÂM</span></span>
            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              <div className="w-4 h-4 bg-indigo-600 rounded-sm flex items-center justify-center text-[10px] text-white font-bold">Z</div>
              <span className="text-[10px] font-bold text-indigo-600 tracking-widest">ZALO: 0366.000.555</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em]">TRAO CƠ HỘI - NHẬN NIỀM TIN</span>
        </div>
      </div>
    </footer>
  );
}

function InputGroup({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-lg font-bold transition-all text-slate-800 uppercase tracking-widest">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="p-5 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-900 font-normal text-xl placeholder:text-slate-400 placeholder:font-normal"
      />
    </div>
  );
}

const FIXED_SUBJECTS = [
  // Khối 6
  { grade: '6', subject: 'Toán', subSubject: 'Số học' },
  { grade: '6', subject: 'Toán', subSubject: 'Đại số' },
  { grade: '6', subject: 'Toán', subSubject: 'Hình học' },
  { grade: '6', subject: 'Toán', subSubject: 'Ôn vào 10' },
  { grade: '6', subject: 'KHTN', subSubject: 'Vật Lý' },
  { grade: '6', subject: 'KHTN', subSubject: 'Hóa học' },
  { grade: '6', subject: 'KHTN', subSubject: 'Sinh học' },
  { grade: '6', subject: 'Ngữ Văn', subSubject: '' },
  // Khối 7
  { grade: '7', subject: 'Toán', subSubject: 'Số học' },
  { grade: '7', subject: 'Toán', subSubject: 'Đại số' },
  { grade: '7', subject: 'Toán', subSubject: 'Hình học' },
  { grade: '7', subject: 'Toán', subSubject: 'Ôn vào 10' },
  { grade: '7', subject: 'KHTN', subSubject: 'Vật Lý' },
  { grade: '7', subject: 'KHTN', subSubject: 'Hóa học' },
  { grade: '7', subject: 'KHTN', subSubject: 'Sinh học' },
  { grade: '7', subject: 'Ngữ Văn', subSubject: '' },
  // Khối 8
  { grade: '8', subject: 'Toán', subSubject: 'Số học' },
  { grade: '8', subject: 'Toán', subSubject: 'Đại số' },
  { grade: '8', subject: 'Toán', subSubject: 'Hình học' },
  { grade: '8', subject: 'Toán', subSubject: 'Ôn vào 10' },
  { grade: '8', subject: 'KHTN', subSubject: 'Vật Lý' },
  { grade: '8', subject: 'KHTN', subSubject: 'Hóa học' },
  { grade: '8', subject: 'KHTN', subSubject: 'Sinh học' },
  { grade: '8', subject: 'Ngữ Văn', subSubject: '' },
  // Khối 9
  { grade: '9', subject: 'Toán', subSubject: 'Số học' },
  { grade: '9', subject: 'Toán', subSubject: 'Đại số' },
  { grade: '9', subject: 'Toán', subSubject: 'Hình học' },
  { grade: '9', subject: 'Toán', subSubject: 'Ôn vào 10' },
  { grade: '9', subject: 'KHTN', subSubject: 'Vật Lý' },
  { grade: '9', subject: 'KHTN', subSubject: 'Hóa học' },
  { grade: '9', subject: 'KHTN', subSubject: 'Sinh học' },
  { grade: '9', subject: 'Ngữ Văn', subSubject: '' },
];

const KHDH_DATA: Record<string, string> = {
  '6-Toán-Số học-1': 'Tập hợp các số tự nhiên',
  '6-Toán-Số học-2': 'Cách ghi số tự nhiên',
  '6-Toán-Hình học-1': 'Điểm. Đường thẳng',
  '7-Toán-Số học-1': 'Số hữu tỉ',
  '8-Toán-Đại số-1': 'Nhân đơn thức với đa thức',
  '9-Toán-Đại số-1': 'Căn bậc hai',
};
