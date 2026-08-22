import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// LocalStorage Fallback Helpers for Instant Testing
const STORAGE_KEYS = {
  STUDENTS: 'aura_students_v1',
  ATTENDANCE: 'aura_attendance_v1',
  AUDITS: 'aura_audits_v1'
};

export const getStoredStudents = () => {
  const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (!data) {
    const initial = [
      { id: '1', name: 'Tejas', roll_number: 'CSE588', section: 'CSE-A', department: 'Computer Science', year: '4th Year (7th Sem)', email: 'tejas@college.edu', face_encoding: null, created_at: new Date().toISOString() }
    ];
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

export const saveStudent = (studentData) => {
  const students = getStoredStudents();
  const newStudent = { id: Date.now().toString(), ...studentData, created_at: new Date().toISOString() };
  students.push(newStudent);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  return newStudent;
};

export const getStoredAttendance = () => {
  const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  return data ? JSON.parse(data) : [];
};

export const logAttendanceRecord = (record) => {
  const logs = getStoredAttendance();
  const newLog = { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), ...record };
  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(logs));
  return newLog;
};