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
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Document, Packer, Paragraph, Table, TableCell, TableRow as DocxTableRow, WidthType, AlignmentType, HeadingLevel, TextRun, PageOrientation, VerticalMergeType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

import { GoogleGenAI } from "@google/genai";

type Tab = 'login' | 'config_hkd' | 'program' | 'schedule' | 'journal' | 'subject_config' | 'students' | 'finance';

interface HKDConfig {
  name: string;
  address: string;
  owner: string;
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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [hkdConfig, setHkdConfig] = useState<HKDConfig>({
    name: '',
    address: '',
    owner: '',
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
      alert('Đã đồng bộ từ google sheets');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Lỗi khi gửi dữ liệu lên Google Sheets.');
    }
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
          ...s,
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

      const formattedPhone = s.phone.startsWith('0') ? s.phone : '0' + s.phone;
      
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
              new TextRun({ text: `Lớp: ${s.grade}`, size: 24 }),
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

  const [scheduleMeta, setScheduleMeta] = useState({ week: '1', fromDate: '', toDate: '', teacher: 'Thầy Tâm' });
  const [journalMeta, setJournalMeta] = useState({ week: '1', fromDate: '', toDate: '', teacher: 'Thầy Tâm' });

  const [scheduleData, setScheduleData] = useState<TableRow[]>([]);
  const [journalData, setJournalData] = useState<TableRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    
    if (savedSchedule) setScheduleData(JSON.parse(savedSchedule));
    if (savedJournal) setJournalData(JSON.parse(savedJournal));
    if (savedStudents) setStudents(JSON.parse(savedStudents));
    if (savedScheduleMeta) setScheduleMeta(JSON.parse(savedScheduleMeta));
    if (savedJournalMeta) setJournalMeta(JSON.parse(savedJournalMeta));
    if (savedPrograms) setTeachingPrograms(JSON.parse(savedPrograms));
    if (savedKHDH) setKhdhData(JSON.parse(savedKHDH));
  }, []);

  useEffect(() => {
    localStorage.setItem('schedule_data', JSON.stringify(scheduleData));
    localStorage.setItem('journal_data', JSON.stringify(journalData));
    localStorage.setItem('students_data', JSON.stringify(students));
    localStorage.setItem('schedule_meta', JSON.stringify(scheduleMeta));
    localStorage.setItem('journal_meta', JSON.stringify(journalMeta));
    localStorage.setItem('teaching_programs', JSON.stringify(teachingPrograms));
  }, [scheduleData, journalData, students, scheduleMeta, journalMeta, teachingPrograms]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setActiveTab('config_hkd');
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
              <h1 className="text-2xl font-bold text-slate-800">Cơ sở giáo dục Hoàng Gia</h1>
              <p className="text-slate-500">Hệ thống quản lý nội bộ</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Tài khoản</label>
              <input type="text" defaultValue="admin" className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Mật khẩu</label>
              <input type="password" defaultValue="123456" className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <button type="submit" className="mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
              <LogIn size={20} />
              Đăng nhập hệ thống
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 z-20">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">Hoàng Gia Edu</span>
        </div>

        <nav className="flex flex-col gap-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Menu chính</p>
          <NavItem active={activeTab === 'config_hkd'} onClick={() => setActiveTab('config_hkd')} icon={<Settings size={20} />} label="Cấu hình HKD" />
          <NavItem 
            active={activeTab === 'program' || activeTab === 'schedule' || activeTab === 'journal' || activeTab === 'subject_config'} 
            onClick={() => setActiveTab('program')} 
            icon={<ClipboardList size={20} />} 
            label="Chương trình dạy học" 
          />
          <NavItem active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users size={20} />} label="Quản lý học sinh" />
          <NavItem active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<DollarSign size={20} />} label="Quản lý tài chính" />
        </nav>

        <div className="mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-full">
              <User className="text-indigo-600 w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{scheduleMeta.teacher}</p>
              <p className="text-xs text-slate-500">Quản trị viên</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        {(activeTab === 'program' || activeTab === 'schedule' || activeTab === 'journal' || activeTab === 'subject_config') && (
          <div className="mb-8 flex flex-wrap gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('program')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'program' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ClipboardList size={18} />
              Quản lý chương trình
            </button>
            <button 
              onClick={() => setActiveTab('subject_config')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'subject_config' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Settings size={18} />
              Cấu hình môn học
            </button>
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'schedule' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calendar size={18} />
              Lịch báo giảng
            </button>
            <button 
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'journal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText size={18} />
              Sổ đầu bài
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'config_hkd' && (
            <motion.div key="hkd" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl flex flex-col gap-8">
              <div>
                <SectionHeader title="Cấu hình Hộ Kinh Doanh" subtitle="Thông tin pháp lý và địa chỉ cơ sở" />
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Tên Hộ Kinh Doanh" value={hkdConfig.name} onChange={v => setHkdConfig({...hkdConfig, name: v})} placeholder="Nhập tên cơ sở..." />
                    <InputGroup label="Chủ hộ" value={hkdConfig.owner} onChange={v => setHkdConfig({...hkdConfig, owner: v})} placeholder="Nhập tên chủ hộ..." />
                  </div>
                  <InputGroup label="Địa chỉ" value={hkdConfig.address} onChange={v => setHkdConfig({...hkdConfig, address: v})} placeholder="Địa chỉ chi tiết..." />
                  <InputGroup label="Google Script URL" value={hkdConfig.scriptUrl || ''} onChange={v => setHkdConfig({...hkdConfig, scriptUrl: v})} placeholder="https://script.google.com/macros/s/.../exec" />
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
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
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
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold border-y border-slate-100">
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
                <div className="flex gap-3">
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
                    className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
                  >
                    <Download size={16} />
                    Tải mẫu Excel
                  </button>
                  <label className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all cursor-pointer shadow-lg shadow-indigo-100">
                    <Upload size={16} />
                    {isAnalyzing ? 'Đang phân tích AI...' : 'Tải danh sách học sinh'}
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
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    <FileDown size={16} />
                    Xuất toàn bộ đơn (Mẫu 2)
                  </button>
                  <button 
                    onClick={() => setStudents([])}
                    className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-200 transition-all"
                  >
                    <Trash2 size={16} />
                    Xóa danh sách
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
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
            </motion.div>
          )}

          {activeTab === 'finance' && (
            <motion.div key="finance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl">
              <SectionHeader title="Quản lý tài chính" subtitle="Theo dõi thu chi và báo cáo tài chính" />
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center py-20">
                <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Tính năng Quản lý tài chính đang được phát triển.</p>
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
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
    >
      <span className={`${active ? 'text-indigo-600' : 'text-slate-400'}`}>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">{title}</h2>
      <p className="text-slate-500 font-medium">{subtitle}</p>
    </div>
  );
}

function InputGroup({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
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
