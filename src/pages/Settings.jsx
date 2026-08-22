import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, HardDrive, CheckCircle2, RefreshCw, Trash2, Key } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);
  const [storageStats, setStorageStats] = useState({ students: 0, attendance: 0 });

  useEffect(() => {
    // Load stored config or env variables
    const storedUrl = localStorage.getItem('aura_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
    const storedKey = localStorage.getItem('aura_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    setSupabaseUrl(storedUrl);
    setSupabaseKey(storedKey);
    calculateStorage();
  }, []);

  const calculateStorage = () => {
    const students = JSON.parse(localStorage.getItem('aura_students_v1') || '[]');
    const attendance = JSON.parse(localStorage.getItem('aura_attendance_v1') || '[]');
    setStorageStats({ students: students.length, attendance: attendance.length });
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('aura_supabase_url', supabaseUrl);
    localStorage.setItem('aura_supabase_key', supabaseKey);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all local storage attendance logs and custom student data?')) {
      localStorage.removeItem('aura_students_v1');
      localStorage.removeItem('aura_attendance_v1');
      calculateStorage();
      alert('Local storage cleared successfully. Default initial data will reload on next visit.');
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h2 className="settings-title">System Configuration & Settings</h2>
          <p className="settings-subtitle">Manage cloud database synchronization, storage limits, and system parameters</p>
        </div>
      </div>

      {savedStatus && (
        <div className="success-banner animate-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span>Supabase credentials successfully updated!</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Supabase Cloud Connection Card */}
        <div className="settings-card">
          <div className="card-header-flex">
            <Database className="w-5 h-5 text-indigo-600" />
            <h3 className="card-heading">Supabase Cloud Sync</h3>
          </div>
          <p className="card-desc">
            Connect your project to a live PostgreSQL Supabase instance for persistent multi-device attendance tracking. If left blank, the system automatically falls back to LocalStorage.
          </p>

          <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
            <div>
              <label className="input-label">Supabase Project URL</label>
              <input 
                type="url" 
                value={supabaseUrl} 
                onChange={(e) => setSupabaseUrl(e.target.value)} 
                placeholder="https://xyzproject.supabase.co" 
                className="input-field" 
              />
            </div>

            <div>
              <label className="input-label">Supabase Anon / API Key</label>
              <input 
                type="password" 
                value={supabaseKey} 
                onChange={(e) => setSupabaseKey(e.target.value)} 
                placeholder="eyJhbGciOiJIUzI1NiIsInR..." 
                className="input-field font-mono text-xs" 
              />
            </div>

            <button type="submit" className="action-save-btn">
              <Key className="w-4 h-4" /> Save Cloud Credentials
            </button>
          </form>
        </div>

        {/* Local Storage & Cache Management */}
        <div className="settings-card">
          <div className="card-header-flex">
            <HardDrive className="w-5 h-5 text-emerald-600" />
            <h3 className="card-heading">Local Cache & Storage</h3>
          </div>
          <p className="card-desc">
            Monitor browser storage usage and manage offline state snapshots for your biometrics kiosk.
          </p>

          <div className="storage-stats-box">
            <div className="stat-row">
              <span className="text-slate-600">Registered Students in Cache:</span>
              <strong className="text-slate-800 font-mono">{storageStats.students} profiles</strong>
            </div>
            <div className="stat-row">
              <span className="text-slate-600">Cached Attendance Logs:</span>
              <strong className="text-slate-800 font-mono">{storageStats.attendance} records</strong>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="button" 
              onClick={handleClearCache}
              className="action-danger-btn"
            >
              <Trash2 className="w-4 h-4" /> Clear Local Storage Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}