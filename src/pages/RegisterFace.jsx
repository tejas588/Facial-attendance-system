import React, { useRef, useEffect, useState } from 'react';
import { UserPlus, Camera, CameraOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { saveStudent } from '../services/attendanceService';
import './RegisterFace.css';

export default function RegisterFace() {
  const videoRef = useRef(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [cameraActive, setCameraActive] = useState(false); // Default to off
  const [statusText, setStatusText] = useState('Camera is offline. Click "Turn On Cam" to begin.');
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    roll_number: '',
    department: 'CSE',
    section: 'CSE-A',
    semester: '7th Semester',
    year: '4th Year',
    email: ''
  });

  // 1. Load Models on Mount (without auto-starting webcam)
  useEffect(() => {
    const loadAI = async () => {
      try {
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setLoadingModels(false);
        setStatusText('AI models ready. Turn on camera to capture.');
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setStatusText('Failed to load AI models. Ensure internet connection for weights.');
      }
    };
    loadAI();

    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = () => {
    setCameraActive(true);
    setStatusText('Starting camera...');
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatusText('Camera active. Position face in frame.');
        }
      })
      .catch((err) => {
        console.error('Webcam access denied:', err);
        setStatusText('Webcam access denied or unavailable.');
        setCameraActive(false);
      });
  };

  const stopWebcam = () => {
    setCameraActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopWebcam();
      setStatusText('Camera turned off.');
    } else {
      startWebcam();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'department') {
      setFormData({
        ...formData,
        department: value,
        section: value === 'CSE' ? 'CSE-A' : 'IT-A'
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // 2. Capture Face Embedding Vector
  const handleCaptureFace = async () => {
    if (!cameraActive || !videoRef.current || loadingModels) {
      alert('Please turn on the camera first.');
      return;
    }

    setStatusText('Detecting face & extracting 128-d descriptor...');
    const video = videoRef.current;

    const detection = await faceapi.detectSingleFace(
      video, 
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.70 })
    )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setStatusText('No face detected clearly. Please adjust lighting and face the camera directly.');
      return;
    }

    const descriptorArray = Array.from(detection.descriptor);
    setCapturedDescriptor(JSON.stringify(descriptorArray));
    setStatusText('Face successfully captured and encoded!');
    setPreviewImage(true);
  };

  // 3. Save Student Record
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!capturedDescriptor) {
      alert('Please capture a valid face embedding before submitting.');
      return;
    }

    if (!formData.name || !formData.roll_number) {
      alert('Please fill in Name and Roll Number.');
      return;
    }

    const newStudent = {
      ...formData,
      face_encoding: capturedDescriptor
    };

    saveStudent(newStudent);
    setSuccessMessage(`Successfully registered ${formData.name} (${formData.roll_number})!`);
    
    setFormData({ 
      name: '', 
      roll_number: '', 
      department: 'CSE', 
      section: 'CSE-A', 
      semester: '7th Semester', 
      year: '4th Year', 
      email: '' 
    });
    setCapturedDescriptor(null);
    setPreviewImage(false);
  };

  return (
    <div className="register-container">
      <div className="register-header">
        <h2 className="register-title">Student Face Registration Portal</h2>
        <p className="register-subtitle">Enroll student biometrics and academic details</p>
      </div>

      {successMessage && (
        <div className="success-banner animate-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="register-grid">
        {/* Webcam Capture Column */}
        <div className="webcam-card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Capture Stream</span>
            <button 
              type="button"
              onClick={toggleCamera}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${cameraActive ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
            >
              {cameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
              {cameraActive ? 'Turn Off Cam' : 'Turn On Cam'}
            </button>
          </div>

          <div className="webcam-wrapper">
            {cameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="register-video" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[320px] text-slate-400 gap-2">
                <CameraOff className="w-12 h-12" />
                <p className="text-sm">Camera is currently turned off</p>
              </div>
            )}
            <div className="face-oval-guide"></div>
          </div>

          <div className="webcam-footer">
            <p className="status-indicator-text">{statusText}</p>
            <button 
              type="button"
              onClick={handleCaptureFace}
              disabled={loadingModels || !cameraActive}
              className="capture-btn"
            >
              <Camera className="w-4 h-4" /> Capture Face Biometric
            </button>
          </div>
        </div>

        {/* Student Metadata Form */}
        <div className="form-card">
          <h3 className="form-heading">Student Information</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Full Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                placeholder="e.g. Tejas" 
                required
                className="input-field" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Roll Number</label>
                <input 
                  type="text" 
                  name="roll_number" 
                  value={formData.roll_number} 
                  onChange={handleInputChange} 
                  placeholder="e.g. CSE588" 
                  required
                  className="input-field" 
                />
              </div>
              <div>
                <label className="input-label">Department</label>
                <select 
                  name="department" 
                  value={formData.department} 
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Section</label>
                <select 
                  name="section" 
                  value={formData.section} 
                  onChange={handleInputChange}
                  className="input-field"
                >
                  {formData.department === 'CSE' ? (
                    <>
                      <option value="CSE-A">CSE-A</option>
                      <option value="CSE-B">CSE-B</option>
                      <option value="CSE-C">CSE-C</option>
                      <option value="CSE-D">CSE-D</option>
                    </>
                  ) : (
                    <>
                      <option value="IT-A">IT-A</option>
                      <option value="IT-B">IT-B</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="input-label">Semester</label>
                <select 
                  name="semester" 
                  value={formData.semester} 
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="3rd Semester">3rd Semester</option>
                  <option value="4th Semester">4th Semester</option>
                  <option value="5th Semester">5th Semester</option>
                  <option value="6th Semester">6th Semester</option>
                  <option value="7th Semester">7th Semester</option>
                  <option value="8th Semester">8th Semester</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Academic Year</label>
                <select 
                  name="year" 
                  value={formData.year} 
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div>
                <label className="input-label">College Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  placeholder="name@college.edu" 
                  className="input-field" 
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={!capturedDescriptor}
                className="submit-btn"
              >
                <UserPlus className="w-4 h-4" /> Save Student & Face Encoding
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}