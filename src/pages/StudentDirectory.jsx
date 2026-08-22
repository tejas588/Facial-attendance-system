import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, ShieldCheck, ShieldAlert, Trash2, Mail } from 'lucide-react';
import { getStoredStudents } from '../services/attendanceService';
import './StudentDirectory.css';

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = () => {
    const data = getStoredStudents();
    setStudents(data);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this student record?')) {
      const updated = students.filter(s => s.id !== id);
      localStorage.setItem('aura_students_v1', JSON.stringify(updated));
      setStudents(updated);
    }
  };

  // Filter logic based on search and section
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSection = selectedSection === 'ALL' || student.section === selectedSection;

    return matchesSearch && matchesSection;
  });

  return (
    <div className="directory-container">
      <div className="directory-header">
        <div>
          <h2 className="directory-title">Student Directory & Biometric Registry</h2>
          <p className="directory-subtitle">Manage enrolled students, search records, and verify face embedding statuses</p>
        </div>
        <div className="directory-stats">
          <Users className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-slate-800">{students.length} Enrolled</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="directory-filter-bar">
        <div className="search-input-wrapper">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <input 
            type="text"
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-select-wrapper">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Sections</option>
            <optgroup label="Computer Science (CSE)">
              <option value="CSE-A">CSE-A</option>
              <option value="CSE-B">CSE-B</option>
              <option value="CSE-C">CSE-C</option>
              <option value="CSE-D">CSE-D</option>
            </optgroup>
            <optgroup label="Information Technology (IT)">
              <option value="IT-A">IT-A</option>
              <option value="IT-B">IT-B</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="directory-table-card">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="directory-table">
            <thead>
              <tr className="directory-table-header-row">
                <th className="directory-th">Student Name</th>
                <th className="directory-th">Roll Number</th>
                <th className="directory-th">Department</th>
                <th className="directory-th">Section</th>
                <th className="directory-th">Semester</th>
                <th className="directory-th">Biometric Status</th>
                <th className="directory-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="directory-row-hover">
                    <td className="directory-td font-medium text-slate-800">
                      <div>{student.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {student.email || 'No email provided'}
                      </div>
                    </td>
                    <td className="directory-td text-slate-600 font-mono text-xs">{student.roll_number}</td>
                    <td className="directory-td text-slate-600">{student.department}</td>
                    <td className="directory-td">
                      <span className="section-pill">{student.section || 'CSE-A'}</span>
                    </td>
                    <td className="directory-td text-slate-600">{student.semester || '7th Semester'}</td>
                    <td className="directory-td">
                      {student.face_encoding ? (
                        <span className="bio-status-registered">
                          <ShieldCheck className="w-4 h-4" /> Enrolled
                        </span>
                      ) : (
                        <span className="bio-status-pending">
                          <ShieldAlert className="w-4 h-4" /> Pending Scan
                        </span>
                      )}
                    </td>
                    <td className="directory-td text-right">
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="delete-btn"
                        title="Remove Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No student records found matching your search.
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