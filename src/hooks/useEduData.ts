import { useState, useEffect } from 'react';

export interface Student {
  id: string;
  name: string;
  email: string;
  classId: string;
  grade?: number;
}

export interface Class {
  id: string;
  name: string;
}

const STORAGE_KEY_STUDENTS = 'edumanager_students';
const STORAGE_KEY_CLASSES = 'edumanager_classes';

export const useEduData = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    const savedStudents = localStorage.getItem(STORAGE_KEY_STUDENTS);
    const savedClasses = localStorage.getItem(STORAGE_KEY_CLASSES);
    if (savedStudents) setStudents(JSON.parse(savedStudents));
    if (savedClasses) setClasses(JSON.parse(savedClasses));
  }, []);

  const saveStudents = (data: Student[]) => {
    setStudents(data);
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(data));
  };

  const saveClasses = (data: Class[]) => {
    setClasses(data);
    localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(data));
  };

  const addStudent = (student: Omit<Student, 'id'>) => {
    const newStudent = { ...student, id: crypto.randomUUID() };
    saveStudents([...students, newStudent]);
  };

  const deleteStudent = (id: string) => {
    saveStudents(students.filter(s => s.id !== id));
  };

  const updateStudentGrade = (id: string, grade: number) => {
    saveStudents(students.map(s => s.id === id ? { ...s, grade } : s));
  };

  const addClass = (name: string) => {
    const newClass = { id: crypto.randomUUID(), name };
    saveClasses([...classes, newClass]);
  };

  const deleteClass = (id: string) => {
    saveClasses(classes.filter(c => c.id !== id));
    // Also clean up students in that class
    saveStudents(students.filter(s => s.classId !== id));
  };

  return {
    students,
    classes,
    addStudent,
    deleteStudent,
    updateStudentGrade,
    addClass,
    deleteClass
  };
};
