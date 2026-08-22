import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, UserX, ShieldAlert, Download, 
  Activity, CheckCircle, XCircle, Calendar, Clock, Filter, Trash2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { getStoredAttendance, getStoredStudents } from '../services/attendanceService';
import './Dashboard.css';

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedSection, setSelectedSection] = useState('ALL');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    const attendanceLogs = getStoredAttendance();
    const students = getStoredStudents();
    setLogs(attendanceLogs);
    setTotalStudents(students.length);
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all attendance check-in logs?')) {
      localStorage.removeItem('aura_attendance_v1');
      setLogs([]);
    }
  };

  // Filter logs section-wise
  const filteredLogs = logs.filter(log => {
    if (selectedSection === 'ALL') return true;
    return log.section === selectedSection;
  });

  // Compute live KPI metrics from actual logs
  const presentTodayCount = logs.filter(log => log.status === 'Verified').length;
  const spoofsBlockedCount = logs.filter(log => log.status === 'Spoof Detected').length;
  const absentCount = Math.max(0, totalStudents - presentTodayCount);

  // Compute section-wise breakdown dynamically from live logs
  const sectionCounts = logs.reduce((acc, log) => {
    if (log.status === 'Verified' && log.section && log.section !== 'N/A') {
      acc[log.section] = (acc[log.section] || 0) + 1;
    }
    return acc;
  }, {});

  const dynamicSectionData = Object.keys(sectionCounts).length > 0 
    ? Object.keys(sectionCounts).map(sec => ({ name: sec, present: sectionCounts[sec] }))
    : [
        { name: 'CSE-A', present: 0 },
        { name: 'CSE-B', present: 0 },
        { name: 'IT-A', present: 0 },
      ];

  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No attendance logs available to export.');
      return;
    }
    const headers = ['ID,Name,Roll Number,Section,Date,Time,Liveness Score,Status\n'];
    const csvData = filteredLogs.map(log => 
      `${log.id},${log.student_name || 'N/A'},${log.roll_number || 'N/A'},${log.section || 'N/A'},${log.date || new Date().toLocaleDateString()},${log.timestamp || 'N/A'},${log.liveness_score || 0},${log.status}`
    ).join('\n');
    
    const blob = new Blob([headers + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Logs_${selectedSection}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="dashboard-container">
      {/* Header Area */}
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">Live Attendance & Analytics Dashboard</h2>
          <p className="dashboard-subtitle">Real-time check-in stream recorded directly from the Liveness Kiosk</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="export-btn">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handleClearLogs} className="action-danger-btn !w-auto px-4 py-2 text-sm">
            <Trash2 className="w-4 h-4" /> Clear Logs
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="metrics-grid">
        <MetricCard title="Total Enrolled Students" value={totalStudents} icon={<Users className="w-6 h-6 text-blue-600" />} bg="bg-blue-50" />
        <MetricCard title="Present Today (Verified)" value={presentTodayCount} icon={<UserCheck className="w-6 h-6 text-emerald-600" />} bg="bg-emerald-50" />
        <MetricCard title="Estimated Absent" value={absentCount} icon={<UserX className="w-6 h-6 text-rose-600" />} bg="bg-rose-50" />
        <MetricCard title="Spoofs Blocked" value={spoofsBlockedCount} icon={<ShieldAlert className="w-6 h-6 text-amber-600" />} bg="bg-amber-50" />
      </div>

      {/* Chart Row */}
      <div className="charts-grid">
        <div className="chart-card lg:col-span-2">
          <div className="chart-header">
            <Activity className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Section-wise Live Attendance Breakdown</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicSectionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="present" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Present Checked-In" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Check-in Feed Table with Section Filter */}
      <div className="table-wrapper">
        <div className="table-header-bar flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">
            Live Check-in Feed ({filteredLogs.length} Entries Displayed)
          </h3>
          
          {/* Section Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600 uppercase">Filter Section:</span>
            <select 
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-600 shadow-sm"
            >
              <option value="ALL">All Sections</option>
              <optgroup label="CSE">
                <option value="CSE-A">CSE-A</option>
                <option value="CSE-B">CSE-B</option>
                <option value="CSE-C">CSE-C</option>
                <option value="CSE-D">CSE-D</option>
              </optgroup>
              <optgroup label="IT">
                <option value="IT-A">IT-A</option>
                <option value="IT-B">IT-B</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="table-base">
            <thead>
              <tr className="table-header-row">
                <th className="table-th">Student Name</th>
                <th className="table-th">Roll Number</th>
                <th className="table-th">Section</th>
                <th className="table-th"><Calendar className="w-3.5 h-3.5 inline mr-1" /> Date</th>
                <th className="table-th"><Clock className="w-3.5 h-3.5 inline mr-1" /> Time</th>
                <th className="table-th">Liveness Score</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="table-row-hover">
                    <td className="table-td font-medium text-slate-800">{log.student_name || 'Unknown Visitor'}</td>
                    <td className="table-td text-slate-600 font-mono text-xs">{log.roll_number || 'N/A'}</td>
                    <td className="table-td text-slate-600">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold">
                        {log.section || 'N/A'}
                      </span>
                    </td>
                    <td className="table-td text-slate-600 text-xs">{log.date || new Date().toLocaleDateString()}</td>
                    <td className="table-td text-slate-600 text-xs font-mono">{log.timestamp || 'N/A'}</td>
                    <td className="table-td">
                      <span className="score-badge">
                        {log.liveness_score ? `${log.liveness_score}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="table-td">
                      {log.status === 'Verified' ? (
                        <span className="status-verified">
                          <CheckCircle className="w-4 h-4" /> Verified
                        </span>
                      ) : (
                        <span className="status-spoof">
                          <XCircle className="w-4 h-4" /> Spoof Blocked
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No records found for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, bg }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon-box ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="metric-title">{title}</p>
        <p className="metric-value">{value}</p>
      </div>
    </div>
  );
}