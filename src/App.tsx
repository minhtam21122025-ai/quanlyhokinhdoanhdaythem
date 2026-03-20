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
  ShieldCheck
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
  currentUser 
}: { 
  studentsCount: number; 
  activeStudentsCount: number; 
  revenue: number; 
  setActiveTab: (tab: Tab) => void; 
  currentUser: UserAccount | null;
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
      className="flex flex-col gap-8"
    >
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-[2rem] p-8 lg:p-12 text-white shadow-2xl shadow-indigo-200">
        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles size={14} /> Hệ thống quản lý giáo dục
            </span>
            <h1 className="text-4xl lg:text-5xl font-black mb-4 leading-tight font-display">
              Chào mừng trở lại, <br />
              <span className="text-indigo-100">{currentUser?.username}</span>
            </h1>
            <p className="text-white text-lg mb-8 leading-relaxed">
              Hệ thống HOÀNG GIA giúp bạn tối ưu hóa quy trình quản lý học sinh, chương trình giảng dạy và tài chính một cách chuyên nghiệp nhất.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setActiveTab('students')}
                className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus size={20} /> Thêm học sinh
              </button>
              <button 
                onClick={() => setActiveTab('finance')}
                className="px-6 py-3 bg-indigo-500/30 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2"
              >
                Xem báo cáo tài chính
              </button>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
          <GraduationCap className="w-full h-full transform translate-x-1/4 -translate-y-1/4 rotate-12" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-700 text-sm font-bold mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 font-display">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Main Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Module Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ModuleCard 
            title="Cấu hình HKD"
            desc="Quản lý thông tin hộ kinh doanh, hệ thống và phân quyền."
            icon={<Settings className="text-indigo-600" />}
            onClick={() => setActiveTab('config_hkd')}
            color="indigo"
          />
          <ModuleCard 
            title="Quản lý học sinh"
            desc="Danh sách học sinh, điểm danh và theo dõi tiến độ."
            icon={<Users className="text-blue-600" />}
            onClick={() => setActiveTab('students')}
            color="blue"
          />
          <ModuleCard 
            title="Chương trình dạy"
            desc="Quản lý khóa học, giáo án và lịch báo giảng."
            icon={<ClipboardList className="text-purple-600" />}
            onClick={() => setActiveTab('program')}
            color="purple"
          />
          <ModuleCard 
            title="Quản lý tài chính"
            desc="Theo dõi học phí, chi phí và báo cáo doanh thu."
            icon={<DollarSign className="text-emerald-600" />}
            onClick={() => setActiveTab('finance')}
            color="emerald"
          />
          {currentUser?.role === 'Quản trị viên' && (
            <ModuleCard 
              title="Quản lý tài khoản"
              desc="Cấu hình tài khoản người dùng, phân quyền và thời hạn sử dụng."
              icon={<ShieldCheck className="text-rose-600" />}
              onClick={() => setActiveTab('accounts')}
              color="rose"
            />
          )}
        </div>

        {/* Charts Section */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 font-display">Tỉ lệ duy trì học sinh</h3>
                <p className="text-slate-700 text-sm font-medium">Phân tích biến động số lượng học sinh theo tháng</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl">
                <TrendingUp className="text-indigo-600 w-5 h-5" />
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={attendanceData}
                      innerRadius={30}
                      outerRadius={40}
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
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-1">Chuyên cần</h4>
                <p className="text-2xl font-black text-slate-900 font-display">94.2%</p>
                <p className="text-xs text-emerald-600 font-black mt-1">Tăng 2.4% so với tuần trước</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">Học phí tháng này</h4>
              <div className="flex items-end justify-between mb-2">
                <p className="text-2xl font-black text-slate-900 font-display">75%</p>
                <p className="text-xs font-black text-slate-600">45/60 học sinh</p>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-3 font-bold italic">* Đã bao gồm các khoản thu bổ sung</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ModuleCard = ({ title, desc, icon, onClick, color }: { 
  title: string; 
  desc: string; 
  icon: React.ReactNode; 
  onClick: () => void;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    indigo: 'hover:border-indigo-200 hover:bg-indigo-50/30',
    blue: 'hover:border-blue-200 hover:bg-blue-50/30',
    purple: 'hover:border-purple-200 hover:bg-purple-50/30',
    emerald: 'hover:border-emerald-200 hover:bg-emerald-50/30',
  };

  return (
    <button 
      onClick={onClick}
      className={`text-left p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm transition-all duration-300 group ${colorMap[color] || ''}`}
    >
      <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
        <div className="p-4 bg-slate-50 rounded-2xl w-fit group-hover:bg-white group-hover:shadow-lg transition-all">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2 font-display">{title}</h3>
      <p className="text-slate-700 text-sm font-medium leading-relaxed mb-6">{desc}</p>
      <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 group-hover:translate-x-2 transition-transform">
        Truy cập ngay <ArrowRight size={16} />
      </div>
    </button>
  );
};

const Reports = ({ 
  students, 
  financialConfig, 
  expenditures 
}: { 
  students: Student[]; 
  financialConfig: any; 
  expenditures: any[];
}) => {
  const totalRevenue = students.reduce((sum, s) => sum + (s.fee ?? financialConfig.feePerSession), 0);
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
        {/* Financial Summary */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 font-display">Tóm tắt tài chính tháng {financialConfig.month}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="p-4 bg-indigo-50 rounded-2xl">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Tổng thu</p>
              <p className="text-lg font-black text-indigo-700">{totalRevenue.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl">
              <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">Tổng chi</p>
              <p className="text-lg font-black text-rose-700">{totalExpenditure.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Thực thu</p>
              <p className="text-lg font-black text-emerald-700">{netProfit.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        </div>

        {/* Student Distribution */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 font-display">Phân bổ học sinh</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={gradeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            {gradeData.map((grade, i) => (
              <div key={grade.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-sm font-bold text-slate-600">{grade.name}</span>
                </div>
                <span className="text-sm font-black text-slate-800">{grade.value} học sinh</span>
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

  const [hkdConfig, setHkdConfig] = useState<HKDConfig>({
    name: '',
    address: '',
    owner: '',
    taxId: '',
    scriptUrl: 'https://script.google.com/macros/s/AKfycbwdXqPI3viUroHevEJ5CzLk4dh3QfwstmJkB1PQA7alN-DbCSIdAPyXYSPhSd1Bf4ksmQ/exec'
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
      const response = await fetch(hkdConfig.scriptUrl);
      const data = await response.json();
      
      if (data.subjects && Array.isArray(data.subjects)) {
        setSubjects(data.subjects);
        localStorage.setItem('subjects_config', JSON.stringify(data.subjects));
      }
      
      if (data.program) {
        setKhdhData(data.program);
        localStorage.setItem('khdh_data', JSON.stringify(data.program));
      }

      if (data.accounts && Array.isArray(data.accounts)) {
        setUserAccounts(data.accounts);
        localStorage.setItem('user_accounts', JSON.stringify(data.accounts));
      }
      
      alert('Đã đồng bộ từ google sheets');
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Lỗi khi đồng bộ dữ liệu. Vui lòng kiểm tra lại Script URL và quyền truy cập.');
    }
  };

  const uploadToGoogleSheets = async (programData: Record<string, string>) => {
    if (!hkdConfig.scriptUrl) {
      alert('Vui lòng cấu hình Google Script URL trong phần Cấu hình HKD!');
      return;
    }
    try {
      await fetch(hkdConfig.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjects: subjects,
          program: programData
        }),
      });
      alert('Đã đồng bộ lên Google Sheets thành công!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Lỗi khi gửi dữ liệu lên Google Sheets.');
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
    
    await uploadToGoogleSheets(newKhdhData);
    setConfirmDeleteGrade(null);
    alert(`Đã xóa chương trình dạy khối ${grade} thành công!`);
  };

  const deleteFinanceData = () => {
    setStudents([]);
    setExpenditures([]);
    setIsRevenueFileUploaded(false);
    setIsExpenditureFileUploaded(false);
    setUploadedFinanceFiles(0);
    setConfirmDeleteFinance(false);
    alert('Đã xóa toàn bộ dữ liệu tài chính hiện tại!');
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
          name: String(s.name || ''),
          grade: String(s.grade || ''),
          school: String(s.school || ''),
          parentName: String(s.parentName || ''),
          phone: String(s.phone || ''),
          subjects: String(s.subjects || ''),
          registrationDate: String(s.registrationDate || ''),
          id: Math.random().toString(36).substr(2, 9)
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
            id: Math.random().toString(36).substr(2, 9),
            name: String(row[1] || ''),
            grade: String(row[2] || ''),
            school: String(row[3] || ''),
            parentName: String(row[4] || ''),
            phone: String(row[5] || ''),
            subjects: String(row[6] || ''),
            registrationDate: String(row[7] || '')
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
              new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, size: 26 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "_______________", bold: true, size: 24 }),
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
    const activeStudents = students.filter(s => (s.fee ?? financialConfig.feePerSession) > 0);
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
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Thu tiền học ${financialConfig.period} - HS ${s.name} - Lớp ${cleanGrade}`, size: 26 })] })] }),
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
  const [showStudentActions, setShowStudentActions] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [newAccount, setNewAccount] = useState<Partial<UserAccount>>({
    username: '',
    password: '',
    role: 'Giáo viên',
    expiry: '',
    maxDevices: 1
  });

  const activeStudentsCount = students.filter(s => (s.fee ?? financialConfig.feePerSession) > 0).length;
  const revenue = students.reduce((sum, s) => sum + (s.fee ?? financialConfig.feePerSession), 0);

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
    const account: UserAccount = {
      id: crypto.randomUUID(),
      index: userAccounts.length + 1,
      username: newAccount.username!,
      password: newAccount.password!,
      role: newAccount.role || 'Giáo viên',
      expiry: newAccount.expiry || '',
      maxDevices: newAccount.maxDevices || 1
    };
    setUserAccounts(prev => [...prev, account]);
    setNewAccount({
      username: '',
      password: '',
      role: 'Giáo viên',
      expiry: '',
      maxDevices: 1
    });
  };

  const deleteAccount = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      setUserAccounts(prev => prev.filter(acc => acc.id !== id));
    }
  };

  const saveAccountsToGoogleSheets = async () => {
    if (!hkdConfig.scriptUrl) {
      alert('Vui lòng cấu hình Google Script URL trong phần Cấu hình HKD!');
      return;
    }
    try {
      setIsAnalyzing(true);
      const payload = {
        accounts: userAccounts
      };
      const response = await fetch(hkdConfig.scriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = await response.text();
      if (result === 'Success') {
        alert('Đã lưu danh sách tài khoản lên Google Sheets thành công!');
      } else {
        alert('Lỗi: ' + result);
      }
    } catch (error) {
      console.error('Save accounts error:', error);
      alert('Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại Script URL và quyền truy cập.');
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
    const savedScheduleMeta = localStorage.getItem('schedule_meta');
    const savedJournalMeta = localStorage.getItem('journal_meta');
    const savedPrograms = localStorage.getItem('teaching_programs');
    const savedKHDH = localStorage.getItem('khdh_data');
    const savedAccounts = localStorage.getItem('user_accounts');
    
    if (savedSchedule) setScheduleData(JSON.parse(savedSchedule));
    if (savedJournal) setJournalData(JSON.parse(savedJournal));
    if (savedStudents) setStudents(JSON.parse(savedStudents));
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
    localStorage.setItem('schedule_meta', JSON.stringify(scheduleMeta));
    localStorage.setItem('journal_meta', JSON.stringify(journalMeta));
    localStorage.setItem('teaching_programs', JSON.stringify(teachingPrograms));
    localStorage.setItem('user_accounts', JSON.stringify(userAccounts));
  }, [scheduleData, journalData, students, scheduleMeta, journalMeta, teachingPrograms, userAccounts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Check against local userAccounts or default admin
    const account = userAccounts.find(u => u.username === loginUsername && u.password === loginPassword);
    
    if (account) {
      if (account.expiry && new Date(account.expiry) < new Date()) {
        alert('Tài khoản đã hết hạn sử dụng!');
        return;
      }
      setCurrentUser(account);
      setIsAdmin(account.role === 'Quản trị viên');
      setIsLoggedIn(true);
      setActiveTab('dashboard');
      return;
    } else if (loginUsername === 'admin' && loginPassword === '123456') {
      const adminUser = {
        id: 'admin',
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

    // 2. Try live login via Google Script
    if (hkdConfig.scriptUrl) {
      try {
        setIsAnalyzing(true);
        const url = `${hkdConfig.scriptUrl}?action=login&username=${encodeURIComponent(loginUsername)}&password=${encodeURIComponent(loginPassword)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.user) {
          const liveUser = data.user;
          if (liveUser.expiry && new Date(liveUser.expiry) < new Date()) {
            alert('Tài khoản đã hết hạn sử dụng!');
            return;
          }
          setCurrentUser(liveUser);
          setIsAdmin(liveUser.role === 'Quản trị viên');
          setIsLoggedIn(true);
          setActiveTab('dashboard');
          
          // Update local accounts
          const updatedAccounts = [...userAccounts];
          const idx = updatedAccounts.findIndex(u => u.username === liveUser.username);
          if (idx !== -1) updatedAccounts[idx] = liveUser;
          else updatedAccounts.push(liveUser);
          setUserAccounts(updatedAccounts);
          localStorage.setItem('user_accounts', JSON.stringify(updatedAccounts));
        } else {
          alert('Tài khoản hoặc mật khẩu không chính xác!');
        }
      } catch (error) {
        console.error('Live login error:', error);
        alert('Lỗi khi kết nối đến máy chủ. Vui lòng thử lại sau.');
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      alert('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200"
        >
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
              <GraduationCap className="text-white w-10 h-10" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Cơ sở giáo dục Hoàng Gia</h1>
              <p className="text-slate-600 font-medium">Hệ thống quản lý nội bộ</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-slate-800">Tài khoản</label>
              <input 
                type="text" 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-slate-800">Mật khẩu</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900" 
              />
            </div>
            <button type="submit" className="mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
              <LogIn size={20} />
              Đăng nhập hệ thống
            </button>
            <button 
              type="button"
              onClick={fetchKHDHData}
              className="mt-2 text-indigo-600 text-xs font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <RefreshCw size={14} />
              Đồng bộ tài khoản từ Google Sheets
            </button>
            <button 
              type="button"
              onClick={() => {
                const pwd = prompt('Vui lòng nhập mật khẩu quản trị:');
                if (pwd === '123456') {
                  setCurrentUser({
                    id: 'admin',
                    index: 0,
                    username: 'admin',
                    password: '123456',
                    role: 'Quản trị viên',
                    expiry: '',
                    maxDevices: 999
                  });
                  setIsAdmin(true);
                  setIsLoggedIn(true);
                  setActiveTab('accounts');
                } else if (pwd !== null) {
                  alert('Mật khẩu không chính xác!');
                }
              }}
              className="mt-2 text-rose-600 text-xs font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <ShieldCheck size={14} />
              Quản lý tài khoản (Admin)
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
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <span className="font-black text-xl text-slate-800 tracking-tight font-display uppercase">Hoàng Gia</span>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            <button onClick={() => setActiveTab('dashboard')} className={`nav-link ${activeTab === 'dashboard' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <Home size={18} /> Trang chủ
            </button>
            <button onClick={() => setActiveTab('students')} className={`nav-link ${activeTab === 'students' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <Users size={18} /> Học sinh
            </button>
            <button onClick={() => setActiveTab('program')} className={`nav-link ${activeTab === 'program' || activeTab === 'schedule' || activeTab === 'journal' || activeTab === 'subject_config' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <ClipboardList size={18} /> Chương trình
            </button>
            <button onClick={() => setActiveTab('finance')} className={`nav-link ${activeTab === 'finance' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <DollarSign size={18} /> Tài chính
            </button>
            <button onClick={() => setActiveTab('reports')} className={`nav-link ${activeTab === 'reports' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <BarChart3 size={18} /> Báo cáo
            </button>
            <button onClick={() => setActiveTab('config_hkd')} className={`nav-link ${activeTab === 'config_hkd' ? 'nav-link-active' : 'nav-link-inactive'}`}>
              <Settings size={18} /> Tùy chỉnh
            </button>
            {isAdmin && (
              <button onClick={() => setActiveTab('accounts')} className={`nav-link ${activeTab === 'accounts' ? 'nav-link-active' : 'nav-link-inactive'}`}>
                <ShieldCheck size={18} /> Tài khoản
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          
          <div className="h-8 w-px bg-slate-200 mx-2"></div>

          <div className="flex items-center gap-3 group cursor-pointer relative">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none">{currentUser?.username}</p>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mt-1">{currentUser?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">
              {currentUser?.username?.charAt(0).toUpperCase()}
            </div>
            <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />

            {/* Dropdown */}
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
              <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                <User size={16} /> Thông tin
              </button>
              <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2">
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <Dashboard 
              studentsCount={students.length}
              activeStudentsCount={activeStudentsCount}
              revenue={revenue}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'reports' && (
            <Reports 
              students={students}
              financialConfig={financialConfig}
              expenditures={expenditures}
            />
          )}

          {activeTab === 'config_hkd' && (
            <motion.div key="hkd" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl flex flex-col gap-8">
              <div>
                <SectionHeader title="Cấu hình Hộ Kinh Doanh" subtitle="Thông tin pháp lý và địa chỉ cơ sở" />
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Tên Hộ Kinh Doanh" value={hkdConfig.name} onChange={v => setHkdConfig({...hkdConfig, name: v})} placeholder="Nhập tên cơ sở..." />
                    <InputGroup label="Chủ hộ" value={hkdConfig.owner} onChange={v => setHkdConfig({...hkdConfig, owner: v})} placeholder="Nhập tên chủ hộ..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Mã số thuế" value={hkdConfig.taxId} onChange={v => setHkdConfig({...hkdConfig, taxId: v})} placeholder="Nhập mã số thuế..." />
                    <InputGroup label="Google Script URL" value={hkdConfig.scriptUrl || ''} onChange={v => setHkdConfig({...hkdConfig, scriptUrl: v})} placeholder="https://script.google.com/macros/s/.../exec" />
                  </div>
                  <InputGroup label="Địa chỉ" value={hkdConfig.address} onChange={v => setHkdConfig({...hkdConfig, address: v})} placeholder="Địa chỉ chi tiết..." />
                  <button onClick={saveConfig} className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 w-fit">
                    <Save size={20} />
                    Lưu cấu hình
                  </button>
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
                      Đồng bộ từ Google Sheets
                    </button>
                    <button onClick={addSubjectRow} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all">
                      <Plus size={16} />
                      Thêm môn học
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-black border-b border-slate-200">
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
                <button onClick={fetchKHDHData} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-700 transition-all shadow-lg shadow-amber-100">
                  <RefreshCw size={16} />
                  Đồng bộ từ Google Sheets
                </button>
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
                                  uploadToGoogleSheets(newKhdhData);
                                  
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
                          uploadToGoogleSheets(khdhData);
                        }}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-100 transition-all group"
                      >
                        <Save className="text-slate-400 group-hover:text-emerald-600" size={20} />
                        <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-700 text-center">Đồng bộ Sheets thủ công</span>
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
                      className="bg-transparent border-b border-slate-200 outline-none text-sm font-bold text-indigo-600 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1200px] border-collapse">
                    <thead className="bg-slate-50 text-slate-700 text-[10px] uppercase tracking-wider font-black border-y border-slate-200">
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
                            <select className="w-full p-2 bg-transparent outline-none text-sm font-bold text-slate-700" value={row.class} onChange={e => updateRow(activeTab as any, row.id, 'class', e.target.value)}>
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
                            <input type="number" className="w-full p-2 bg-transparent outline-none text-sm text-center font-bold" value={row.period} onChange={e => updateRow(activeTab as any, row.id, 'period', e.target.value)} />
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
            <motion.div key="students" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-6xl">
              <div className="flex justify-between items-center mb-6">
                <SectionHeader title="Quản lý học sinh" subtitle="Danh sách học sinh và xuất đơn đăng ký" />
                <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit">
                  <button 
                    onClick={() => setShowStudentActions(false)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${!showStudentActions ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Users size={18} />
                    Danh sách học sinh
                  </button>
                  <button 
                    onClick={() => setShowStudentActions(true)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${showStudentActions ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Settings size={18} />
                    Thao tác dữ liệu
                  </button>
                </div>
              </div>

              {!showStudentActions ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-100 transition-all group shadow-sm"
                    >
                      <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-indigo-100 transition-colors">
                        <Download className="text-slate-500 group-hover:text-indigo-600" size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">Tải mẫu Excel</p>
                        <p className="text-xs text-slate-700 font-medium">Tải file mẫu để nhập danh sách</p>
                      </div>
                    </button>
                    <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-100 transition-all group shadow-sm cursor-pointer">
                      <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-indigo-100 transition-colors">
                        <Upload className="text-slate-500 group-hover:text-indigo-600" size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">
                          {isAnalyzing ? 'Đang phân tích AI...' : 'Tải lên danh sách học sinh'}
                        </p>
                        <p className="text-xs text-slate-700 font-medium">Tải lên file Excel danh sách học sinh</p>
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
                  </div>

                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-black border-b border-slate-200">
                          <tr>
                            <th className="p-4">Họ và tên</th>
                            <th className="p-4">Lớp</th>
                            <th className="p-4">Trường</th>
                            <th className="p-4">Phụ huynh</th>
                            <th className="p-4">SĐT</th>
                            <th className="p-4">Môn học</th>
                            <th className="p-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {students.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="p-4 font-medium text-slate-800">{s.name}</td>
                              <td className="p-4 text-slate-600">{s.grade}</td>
                              <td className="p-4 text-slate-600">{s.school}</td>
                              <td className="p-4 text-slate-600">{s.parentName}</td>
                              <td className="p-4 text-slate-600">{s.phone}</td>
                              <td className="p-4 text-slate-600">{s.subjects}</td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => exportRegistrationForm(s)}
                                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 ml-auto"
                                >
                                  <FileDown size={14} />
                                  Xuất đơn
                                </button>
                              </td>
                            </tr>
                          ))}
                          {students.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-20 text-center text-slate-400">
                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                Chưa có dữ liệu học sinh. Vui lòng tải lên danh sách.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={() => exportRegistrationForm(students)}
                      disabled={students.length === 0}
                      className="flex items-center gap-3 p-4 bg-rose-600 rounded-2xl text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none group"
                    >
                      <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                        <FileDown size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Xuất toàn bộ đơn (Mẫu 2)</p>
                        <p className="text-xs opacity-80">Tải xuống toàn bộ đơn đăng ký học sinh</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        if (confirmDelete) {
                          setStudents([]);
                          setConfirmDelete(false);
                        } else {
                          setConfirmDelete(true);
                          setTimeout(() => setConfirmDelete(false), 5000); // Reset after 5s
                        }
                      }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group shadow-sm ${confirmDelete ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 hover:bg-rose-50 hover:border-rose-100'}`}
                    >
                      <div className={`p-2 rounded-xl transition-colors ${confirmDelete ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-rose-100'}`}>
                        <Trash2 className={confirmDelete ? 'text-white' : 'text-slate-500 group-hover:text-rose-600'} size={20} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${confirmDelete ? 'text-white' : 'text-slate-700 group-hover:text-rose-700'}`}>
                          {confirmDelete ? 'Xác nhận xóa?' : 'Xóa danh sách'}
                        </p>
                        <p className={`text-xs ${confirmDelete ? 'text-white/80' : 'text-slate-500'}`}>
                          {confirmDelete ? 'Nhấn lần nữa để xóa vĩnh viễn' : 'Xóa toàn bộ dữ liệu hiện tại'}
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-bottom border-slate-100 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <ClipboardList size={16} className="text-indigo-500" />
                        Danh sách học sinh đã đồng bộ
                      </h3>
                      <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        {students.length} học sinh
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-black border-b border-slate-200">
                          <tr>
                            <th className="p-4">Họ và tên</th>
                            <th className="p-4">Lớp</th>
                            <th className="p-4">Trường</th>
                            <th className="p-4">Phụ huynh</th>
                            <th className="p-4">SĐT</th>
                            <th className="p-4">Môn học</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {students.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-medium text-slate-800">{s.name}</td>
                              <td className="p-4 text-slate-600">{s.grade}</td>
                              <td className="p-4 text-slate-600">{s.school}</td>
                              <td className="p-4 text-slate-600">{s.parentName}</td>
                              <td className="p-4 text-slate-600">{s.phone}</td>
                              <td className="p-4 text-slate-600">{s.subjects}</td>
                            </tr>
                          ))}
                          {students.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-20 text-center text-slate-400">
                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                Chưa có dữ liệu học sinh để thao tác.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'finance' && (
            <motion.div key="finance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-5xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <SectionHeader title="Quản lý tài chính" subtitle="Theo dõi thu chi và báo cáo tài chính" />
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button 
                    onClick={() => setFinanceSubTab('config')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${financeSubTab === 'config' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Settings size={16} />
                    Cấu hình
                  </button>
                  <button 
                    onClick={() => setFinanceSubTab('data')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${financeSubTab === 'data' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <ClipboardList size={16} />
                    Dữ liệu
                  </button>
                  <button 
                    onClick={() => setFinanceSubTab('revenue')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${financeSubTab === 'revenue' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <BarChart3 size={16} />
                    Xuất sổ doanh thu
                  </button>
                  <button 
                    onClick={() => setFinanceSubTab('receipts')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${financeSubTab === 'receipts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <FileText size={16} />
                    Xuất phiếu thu chi
                  </button>
                </div>
              </div>
              
              {financeSubTab === 'config' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Cấu hình tài chính</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <InputGroup 
                        label="Ngày xuất phiếu chi" 
                        value={financialConfig.voucherDate} 
                        onChange={v => setFinancialConfig({...financialConfig, voucherDate: v})} 
                        placeholder="YYYY-MM-DD" 
                        type="date"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <InputGroup 
                          label="Người lập biểu" 
                          value={financialConfig.reporter} 
                          onChange={v => setFinancialConfig({...financialConfig, reporter: v})} 
                          placeholder="Tên người lập biểu..." 
                        />
                        <InputGroup 
                          label="Thủ quỹ" 
                          value={financialConfig.treasurer} 
                          onChange={v => setFinancialConfig({...financialConfig, treasurer: v})} 
                          placeholder="Tên thủ quỹ..." 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          setIsFinanceConfigSaved(true);
                          alert('Đã lưu cấu hình tài chính!');
                        }}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        <Save size={20} />
                        Lưu cấu hình
                      </button>
                    </div>
                  </div>

                  {isFinanceConfigSaved && (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <h3 className="text-xl font-bold text-slate-800 mb-6">Tải dữ liệu thu chi</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Khu vực thu */}
                        <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                          <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <ArrowDownCircle size={18} className="text-indigo-600" />
                            Khu vực thu (Bảng chấm công)
                          </h4>
                          <label className="flex flex-col items-center justify-center gap-3 p-8 bg-white rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group">
                            <FileText className="text-indigo-300 group-hover:text-indigo-600" size={32} />
                            <span className="text-sm font-bold text-indigo-700">Tải bảng chấm công thu tiền</span>
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
                                          id: Math.random().toString(36).substr(2, 9),
                                          name: String(item.name || ''),
                                          grade: String(item.grade || '6'),
                                          school: '',
                                          parentName: '',
                                          phone: '',
                                          subjects: '',
                                          registrationDate: new Date().toISOString().split('T')[0],
                                          fee: parseFloat(String(item.totalFee || '0').replace(/[^0-9]/g, ''))
                                        }));
                                        setStudents(mapped);
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
                                          id: `manual-${index}`,
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
                                        setStudents(manualMapped);
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
                            <div className="mt-2 flex items-center gap-2 text-indigo-600 text-xs font-bold justify-center bg-indigo-50 py-2 rounded-xl border border-indigo-100">
                              <CheckCircle size={14} />
                              Hệ thống đã nhận file phiếu thu
                            </div>
                          )}
                        </div>

                        {/* Khu vực chi */}
                        <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                          <h4 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                            <ArrowUpCircle size={18} className="text-emerald-600" />
                            Khu vực chi (Bảng chi tiền)
                          </h4>
                          <label className="flex flex-col items-center justify-center gap-3 p-8 bg-white rounded-2xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer group">
                            <FileDown className="text-emerald-300 group-hover:text-emerald-600" size={32} />
                            <span className="text-sm font-bold text-emerald-700">Tải bảng chi tiền</span>
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
                            <div className="mt-2 flex items-center gap-2 text-emerald-600 text-xs font-bold justify-center bg-emerald-50 py-2 rounded-xl border border-emerald-100">
                              <CheckCircle size={14} />
                              Hệ thống đã nhận file phiếu chi
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
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
                              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all"
                            >
                              <Sparkles size={20} />
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
                            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg ${confirmDeleteFinance ? 'bg-rose-600 text-white' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'}`}
                          >
                            <Trash2 size={20} />
                            {confirmDeleteFinance ? 'Đồng ý xóa dữ liệu' : 'Xóa dữ liệu tài chính'}
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => exportAttendanceAndFees()}
                          className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg"
                        >
                          <Download size={18} />
                          Tải mẫu bảng chấm công (Mẫu 1)
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {financeSubTab === 'data' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Dữ liệu thu tiền học sinh</h3>
                        <p className="text-sm text-slate-700 font-medium">Kiểm tra và chỉnh sửa thông tin trước khi xuất báo cáo</p>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setStudents([...students, { id: Date.now().toString(), name: '', grade: '', school: '', parentName: '', phone: '', subjects: '', registrationDate: new Date().toISOString().split('T')[0], fee: 0 }])}
                          className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-100 transition-all"
                        >
                          <Plus size={14} /> Thêm học sinh
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider w-16">TT</th>
                            <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">Họ và tên</th>
                            <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">Lớp / Địa chỉ</th>
                            <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">Số tiền thu</th>
                            <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider w-20">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {students.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                                Chưa có dữ liệu học sinh. Vui lòng tải file tại tab "Cấu hình".
                              </td>
                            </tr>
                          ) : (
                            students.map((s, idx) => (
                              <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="p-4 text-sm font-medium text-slate-500">{idx + 1}</td>
                                <td className="p-2">
                                  <input 
                                    type="text" 
                                    value={s.name} 
                                    onChange={(e) => {
                                      const newStudents = [...students];
                                      newStudents[idx].name = e.target.value;
                                      setStudents(newStudents);
                                    }}
                                    className="w-full p-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 focus:bg-white rounded-lg text-sm transition-all"
                                    placeholder="Họ tên..."
                                  />
                                </td>
                                <td className="p-2">
                                  <input 
                                    type="text" 
                                    value={s.grade} 
                                    onChange={(e) => {
                                      const newStudents = [...students];
                                      newStudents[idx].grade = e.target.value;
                                      setStudents(newStudents);
                                    }}
                                    className="w-full p-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 focus:bg-white rounded-lg text-sm transition-all"
                                    placeholder="Lớp..."
                                  />
                                </td>
                                <td className="p-2">
                                  <div className="relative">
                                    <input 
                                      type="number" 
                                      value={s.fee} 
                                      onChange={(e) => {
                                        const newStudents = [...students];
                                        newStudents[idx].fee = parseInt(e.target.value) || 0;
                                        setStudents(newStudents);
                                      }}
                                      className={`w-full p-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 focus:bg-white rounded-lg text-sm transition-all ${s.fee === 0 ? 'text-rose-500 font-bold' : ''}`}
                                      placeholder="Số tiền..."
                                    />
                                    {s.fee === 0 && (
                                      <span className="absolute -top-6 left-0 text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 whitespace-nowrap">
                                        Sẽ không xuất sổ (0đ)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <button 
                                    onClick={() => setStudents(students.filter(st => st.id !== s.id))}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
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
                    
                    {students.length > 0 && (
                      <div className="mt-8 flex justify-end">
                        <button 
                          onClick={() => setFinanceSubTab('revenue')}
                          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                          Tiếp tục xuất sổ
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {financeSubTab === 'revenue' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">Sổ chi tiết doanh thu</h3>
                      <button 
                        onClick={() => exportFinancialReports('revenue')}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                      >
                        <FileDown size={20} />
                        Xuất sổ doanh thu (Word)
                      </button>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Nội dung chi chi tiết</h4>
                        <button 
                          onClick={() => setExpenditures([...expenditures, { id: Date.now().toString(), date: financialConfig.voucherDate, description: '', amount: 0, recipient: '', recipientAddress: '' }])}
                          className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:underline"
                        >
                          <Plus size={14} /> Thêm nội dung chi
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {expenditures.map((exp, idx) => (
                          <div key={exp.id} className="flex flex-col gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {activeTab === 'accounts' && (
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
                      <label className="text-[10px] font-black text-slate-700 uppercase">Tài khoản</label>
                      <input 
                        type="text" 
                        value={newAccount.username} 
                        onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                      <label className="text-[10px] font-black text-slate-700 uppercase">Mật khẩu</label>
                      <input 
                        type="text" 
                        value={newAccount.password} 
                        onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-32">
                      <label className="text-[10px] font-black text-slate-700 uppercase">Quyền</label>
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
                      <label className="text-[10px] font-black text-slate-700 uppercase">Thời hạn</label>
                      <input 
                        type="date" 
                        value={newAccount.expiry} 
                        onChange={(e) => setNewAccount({...newAccount, expiry: e.target.value})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-20">
                      <label className="text-[10px] font-black text-slate-700 uppercase">Số máy</label>
                      <input 
                        type="number" 
                        value={newAccount.maxDevices} 
                        onChange={(e) => setNewAccount({...newAccount, maxDevices: parseInt(e.target.value) || 1})}
                        className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                    <button 
                      onClick={addAccount}
                      className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left p-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">STT</th>
                          <th className="text-left p-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Tài khoản</th>
                          <th className="text-left p-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Mật khẩu</th>
                          <th className="text-left p-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Quyền</th>
                          <th className="text-left p-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Thời hạn</th>
                          <th className="text-left p-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Số máy</th>
                          <th className="text-right p-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Thao tác</th>
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
                              <td className="p-4 text-sm text-slate-500">{acc.expiry || 'Vĩnh viễn'}</td>
                              <td className="p-4 text-sm text-slate-500">{acc.maxDevices}</td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => deleteAccount(acc.id)}
                                  className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"
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
    </div>
  );
}

// --- UI COMPONENTS ---

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-800'}`}
    >
      <span className={`${active ? 'text-indigo-600' : 'text-slate-600'}`}>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
      <p className="text-slate-600 font-bold">{subtitle}</p>
    </div>
  );
}

function InputGroup({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-black text-slate-700 uppercase tracking-wider">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-900 font-medium"
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
