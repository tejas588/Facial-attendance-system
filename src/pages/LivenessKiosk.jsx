import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, CheckCircle2, ShieldAlert, RefreshCw, Eye } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import confetti from 'canvas-confetti';
import { getStoredStudents, logAttendanceRecord } from '../services/attendanceService';
import './LivenessKiosk.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const LIVENESS_FRAMES     = 20;      // frames to sample for temporal checks
const FRAME_INTERVAL_MS   = 50;      // Faster sampling (catches blinks easily)
const MIN_EAR_VARIANCE    = 0.0001;  // static photo variance is near zero
const MIN_HEAD_MOVEMENT   = 0.5;     // pixels of head sway variance
const SHARPNESS_SPOOF_MAX = 18;      // unnaturally uniform sharpness = screen/print

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

const computeEAR = (landmarks) => {
  const le = landmarks.getLeftEye();
  const re = landmarks.getRightEye();
  const earL = (dist(le[1], le[5]) + dist(le[2], le[4])) / (2.0 * dist(le[0], le[3]));
  const earR = (dist(re[1], re[5]) + dist(re[2], re[4])) / (2.0 * dist(re[0], re[3]));
  return (earL + earR) / 2;
};

const computeMAR = (landmarks) => {
  const m = landmarks.getMouth();
  return dist(m[14], m[18]) / dist(m[0], m[6]);
};

const computeVariance = (arr) => {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, v) => a + (v - mean) ** 2, 0) / arr.length;
};

const computeLaplacianVariance = (videoEl, box) => {
  const W = Math.min(box.width,  120);
  const H = Math.min(box.height, 120);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(videoEl, box.x, box.y, box.width, box.height, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const gray = new Float32Array(W * H);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2];
  }

  let sum = 0, count = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const lap = -gray[(y-1)*W + x] - gray[(y+1)*W + x] - gray[y*W + (x-1)] - gray[y*W + (x+1)] + 4 * gray[y*W + x];
      sum += lap * lap;
      count++;
    }
  }
  return sum / count; 
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LivenessKiosk() {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  const [loadingModels,     setLoadingModels]     = useState(true);
  const [cameraActive,      setCameraActive]       = useState(false);
  const [statusText,        setStatusText]         = useState('Camera is offline. Click "Turn On Cam" to begin.');
  const [challenge,         setChallenge]          = useState('Position face in frame');
  const [verificationState, setVerificationState]  = useState('idle');
  const [verifiedStudent,   setVerifiedStudent]    = useState(null);
  const [metrics,           setMetrics]            = useState({ ear: 0, mar: 0, livenessScore: 0 });
  const [blinkPrompt,       setBlinkPrompt]        = useState(false);

  // ── Load models ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setLoadingModels(false);
        setStatusText('AI models ready. Turn on camera to scan.');
      } catch (err) {
        console.error(err);
        setStatusText('Failed to load AI models. Check internet connection.');
      }
    })();
    return () => stopWebcam();
  }, []);

  // ── Camera controls ──────────────────────────────────────────────────────────
  const startWebcam = () => {
    setCameraActive(true);
    setStatusText('Starting camera...');
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatusText('Camera active. Click Verify Attendance.');
        }
      })
      .catch(err => {
        console.error(err);
        setStatusText('Webcam access denied or unavailable.');
        setCameraActive(false);
      });
  };

  const stopWebcam = () => {
    setCameraActive(false);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    if (cameraActive) { stopWebcam(); setStatusText('Camera turned off.'); }
    else               { startWebcam(); }
  };

  // ── Temporal multi-frame sampler ─────────────────────────────────────────────
  const collectFrameSamples = useCallback(() => {
    return new Promise((resolve) => {
      const samples = [];
      let frameCount = 0;

      const sample = async () => {
        if (!videoRef.current || frameCount >= LIVENESS_FRAMES) {
          resolve(samples);
          return;
        }

        // FAST DETECTION: Notice we dropped .withFaceDescriptor() here to prevent lag!
        const det = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks();

        if (det) {
          const ear       = computeEAR(det.landmarks);
          const sharpness = computeLaplacianVariance(videoRef.current, det.detection.box);
          const center    = {
            x: det.detection.box.x + det.detection.box.width / 2,
            y: det.detection.box.y + det.detection.box.height / 2
          };
          samples.push({ ear, sharpness, score: det.detection.score, center });
        }

        frameCount++;
        setTimeout(sample, FRAME_INTERVAL_MS);
      };

      sample();
    });
  }, []);

  // ── Main verify handler ──────────────────────────────────────────────────────
  const handleVerifyClick = async () => {
    if (!cameraActive || !videoRef.current || loadingModels) {
      alert('Please turn on the camera first.');
      return;
    }

    setVerificationState('scanning');
    setBlinkPrompt(true);
    setChallenge('👁️  Please BLINK naturally now...');
    setStatusText('Collecting high-speed liveness signals...');

    // ── Step 1: Collect temporal frame samples ───────────────────────────────
    const samples = await collectFrameSamples();
    setBlinkPrompt(false);

    if (samples.length < 10) {
      setVerificationState('failed');
      setStatusText('Could not detect face consistently. Center your face and retry.');
      return;
    }

    const earValues     = samples.map(s => s.ear);
    const sharpnessVals = samples.map(s => s.sharpness);
    const headXVals     = samples.map(s => s.center.x);

    // ── Step 2: Extract Variances ─────────────────────────────────────────────
    const earVariance  = computeVariance(earValues);
    const headVariance = computeVariance(headXVals);

    // ── Step 3: Relative Blink Detection ──────────────────────────────────────
    const maxEar = Math.max(...earValues);
    const minEar = Math.min(...earValues);
    // If EAR drops by at least 15% from its maximum open state, it's a blink
    const blinkDetected = minEar < (maxEar * 0.85);

    // ── Step 4: Laplacian sharpness check ─────────────────────────────────────
    const avgSharpness = sharpnessVals.reduce((a, b) => a + b, 0) / sharpnessVals.length;
    const sharpnessSpoof = avgSharpness < SHARPNESS_SPOOF_MAX;

    // ── Step 5: Aggregate liveness decision ───────────────────────────────────
    let livenessPoints = 0;
    if (blinkDetected)                      livenessPoints += 2;
    if (earVariance > MIN_EAR_VARIANCE)     livenessPoints += 1;
    if (headVariance > MIN_HEAD_MOVEMENT)   livenessPoints += 1; // Real faces sway slightly
    if (!sharpnessSpoof)                    livenessPoints += 1;

    // Require 3 out of 5 possible points to pass
    const passed = livenessPoints >= 3;

    if (!passed) {
      setVerificationState('failed');
      const reason = !blinkDetected 
        ? 'No blink detected — possible static photo.' 
        : 'Unnatural stability — possible screen replay.';
        
      setStatusText(`Spoof Blocked! ${reason}`);
      logAttendanceRecord({
        student_id: 'spoof_attempt', student_name: 'Anti-Spoof Block',
        roll_number: 'N/A', section: 'N/A',
        liveness_score: livenessPoints * 20, status: 'Spoof Detected',
      });
      return;
    }

    // ── Step 6: Liveness Passed - NOW extract Descriptor for Identity ─────────
    setChallenge('Liveness confirmed. Matching identity...');
    setStatusText('Extracting embedding vector...');

    const finalSample = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
      .withFaceLandmarks()
      .withFaceDescriptor(); // Only run this heavy task ONCE at the very end

    if (!finalSample) {
      setVerificationState('failed');
      setStatusText('Face lost during identity check. Please retry.');
      return;
    }

    const finalScore = finalSample.detection.score;
    const finalMAR = computeMAR(finalSample.landmarks);
    setMetrics({ ear: earValues[earValues.length - 1].toFixed(2), mar: finalMAR.toFixed(2), livenessScore: Math.round(finalScore * 100) });

    const students      = getStoredStudents();
    const validProfiles = students.filter(s => s.face_encoding);

    if (validProfiles.length === 0) {
      setVerificationState('failed');
      setStatusText('No registered face encodings found. Register students first!');
      return;
    }

    const labeledDescriptors = validProfiles.map(
      s => new faceapi.LabeledFaceDescriptors(s.id, [new Float32Array(JSON.parse(s.face_encoding))])
    );
    
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.45);
    const match       = faceMatcher.findBestMatch(finalSample.descriptor);

    if (match.label === 'unknown') {
      setVerificationState('failed');
      setStatusText('Liveness passed but identity not found in registry.');
      logAttendanceRecord({
        student_id: 'unknown', student_name: 'Unknown Visitor',
        roll_number: 'N/A', section: 'N/A',
        liveness_score: Math.round(finalScore * 100), status: 'Unknown',
      });
    } else {
      const student = students.find(s => s.id === match.label);
      setVerifiedStudent(student);
      setVerificationState('verified');
      setStatusText(`Attendance verified for ${student.name}!`);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

      const now = new Date();
      logAttendanceRecord({
        student_id: student.id, student_name: student.name,
        roll_number: student.roll_number, section: student.section || 'CSE-A',
        date: now.toLocaleDateString(), timestamp: now.toLocaleTimeString(),
        liveness_score: Math.round(finalScore * 100), status: 'Verified',
      });
    }
  };

  const resetScanner = () => {
    setVerificationState('idle');
    setVerifiedStudent(null);
    setChallenge('Position face in frame');
    setStatusText('Ready for next scan.');
    setMetrics({ ear: 0, mar: 0, livenessScore: 0 });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="kiosk-container">
      <div className="kiosk-header">
        <h2 className="kiosk-title">Classroom Kiosk & Live Verification</h2>
        <p className="kiosk-subtitle">Multi-signal anti-spoofing facial recognition portal</p>
      </div>

      <div className="kiosk-grid">
        <div className="webcam-viewport">
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
          ) : (
            <div className="flex flex-col items-center justify-center h-[380px] text-slate-400 gap-2">
              <CameraOff className="w-12 h-12" />
              <p className="text-sm">Camera is currently turned off</p>
            </div>
          )}
          <canvas ref={canvasRef} className="webcam-canvas" />

          {/* Blink prompt overlay */}
          {blinkPrompt && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-black/70 text-white text-lg font-bold px-6 py-3 rounded-2xl flex items-center gap-2 animate-pulse">
                <Eye className="w-6 h-6 text-yellow-400" /> Please BLINK now
              </div>
            </div>
          )}

          <div className="status-badge-overlay">
            <span className={`status-dot ${loadingModels ? 'loading' : cameraActive ? 'active' : 'bg-rose-500'}`}></span>
            {loadingModels ? 'Loading AI Weights...' : cameraActive ? 'AI Engine Active' : 'Camera Offline'}
          </div>

          <div className="hud-overlay">
            <span>EAR: <strong className="hud-ear">{metrics.ear}</strong></span>
            <span>MAR: <strong className="hud-mar">{metrics.mar}</strong></span>
            <span>Confidence: <strong className="text-indigo-400">{metrics.livenessScore}%</strong></span>
            <span>Status: <strong className="hud-state">{verificationState.toUpperCase()}</strong></span>
          </div>
        </div>

        <div className="control-panel">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="panel-heading !border-0 !pb-0">Verification Panel</h3>
              <button
                onClick={toggleCamera}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  cameraActive
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                {cameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                {cameraActive ? 'Turn Off Cam' : 'Turn On Cam'}
              </button>
            </div>

            <div className="challenge-card">
              <span className="challenge-label">System Status</span>
              <p className="challenge-text">{challenge}</p>
              <p className="challenge-status">{statusText}</p>
            </div>

            {verificationState === 'verified' && verifiedStudent && (
              <div className="result-card-success">
                <CheckCircle2 className="result-icon-success" />
                <h4 className="result-title-success">{verifiedStudent.name}</h4>
                <p className="result-subtitle-success">
                  Roll: {verifiedStudent.roll_number} | {verifiedStudent.section}
                </p>
                <span className="result-pill-success">Attendance Logged Successfully</span>
              </div>
            )}

            {verificationState === 'failed' && (
              <div className="result-card-error">
                <ShieldAlert className="result-icon-error" />
                <h4 className="result-title-error">Security Alert / Spoof Blocked</h4>
                <p className="result-subtitle-error">{statusText}</p>
              </div>
            )}
          </div>

          <div className="pt-4">
            {verificationState === 'idle' || verificationState === 'scanning' ? (
              <button
                onClick={handleVerifyClick}
                disabled={loadingModels || !cameraActive || verificationState === 'scanning'}
                className="action-btn verify-btn"
              >
                <Camera className="w-4 h-4" /> Verify Attendance
              </button>
            ) : (
              <button onClick={resetScanner} className="action-btn reset-btn">
                <RefreshCw className="w-4 h-4" /> Next Student Scan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}