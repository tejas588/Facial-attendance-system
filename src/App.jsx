import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Camera, UserPlus, Users, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';

// Import your page components
import Dashboard from './pages/Dashboard';
import LivenessKiosk from './pages/LivenessKiosk';
import RegisterFace from './pages/RegisterFace';
import StudentDirectory from './pages/StudentDirectory';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Navigation Header */}
        <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-wide">Biometrics</h1>
                <p className="text-xs text-slate-400">Smart Facial Attendance & Liveness Portal</p>
              </div>
            </div>

            <nav className="flex space-x-1 md:space-x-4">
              <NavLink to="/live-attendance" icon={<Camera className="w-4 h-4" />} label="Live Kiosk" />
              <NavLink to="/register" icon={<UserPlus className="w-4 h-4" />} label="Register Face" />
              <NavLink to="/students" icon={<Users className="w-4 h-4" />} label="Directory" />
              <NavLink to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
              <NavLink to="/settings" icon={<SettingsIcon className="w-4 h-4" />} label="Settings" />
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<HomePlaceholder />} />
            
            {/* Active Connected Components */}
            <Route path="/live-attendance" element={<LivenessKiosk />} />
            <Route path="/register" element={<RegisterFace />} />
            <Route path="/students" element={<StudentDirectory />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Helper component for active link styling
function NavLink({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition ${
        isActive 
          ? 'bg-indigo-600 text-white' 
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {React.cloneElement(icon, { 
        className: `w-4 h-4 ${isActive ? 'text-white' : 'text-current'}` 
      })}
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

function HomePlaceholder() {
  return (
    <div className="text-center py-20 animate-fade-in">
      <h2 className="text-3xl font-bold mb-4">Welcome to AURA Attendance Portal</h2>
      <p className="text-slate-600 max-w-xl mx-auto mb-8">
        An advanced facial recognition and anti-spoofing liveness verification system built for engineering academics.
      </p>
      <Link to="/live-attendance" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition">
        Launch Live Attendance Kiosk
      </Link>
    </div>
  );
}