import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

// Setup Cache-First Fetch Interceptor for static model assets (PWA performance optimization)
const cacheName = 'face-api-models-v1';
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url && url.includes('/models/')) {
    try {
      if (window.caches) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          return cachedResponse;
        }
        const response = await originalFetch(input, init);
        if (response && response.ok) {
          await cache.put(input, response.clone());
        }
        return response;
      }
    } catch (e) {
      console.warn('Cache Storage fetch failure, falling back to network fetch:', e);
    }
  }
  return originalFetch(input, init);
};

// Global cache for model loading promise (now unified to use tinyFaceDetector on all devices)
let modelsLoadingPromise = null;
const loadFaceApiModels = () => {
  if (!modelsLoadingPromise) {
    const MODEL_URL = '/models';
    modelsLoadingPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
  }
  return modelsLoadingPromise;
};

const FaceScanner = ({ onCapture, mode = 'enroll', regdNo, email, role, collegeId }) => {
  // Detect if browser is on mobile to apply hardware-optimized configuration
  const isMobile = useRef(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)).current;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isScanningRef = useRef(false);
  const scanLoopRef = useRef(null);

  // Helper to get device-specific face detector options (optimized input size for fast CPU inference)
  const getDetectorOptions = () => {
    return new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
  };

  // State machine refs for recursive loop stability (prevents stale closures)
  const livenessStateRef = useRef('CALIBRATING');
  const baselineOpenEARRef = useRef(null);
  const baselineFramesRef = useRef([]);
  const lastCloseTimeRef = useRef(0);
  const calibrationTimeRef = useRef(0);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState('Loading AI Models...');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  // Advanced Liveness UX States
  const [faceDetected, setFaceDetected] = useState(false);
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [currentEAR, setCurrentEAR] = useState(null);
  const [baselineEARState, setBaselineEARState] = useState(null);

  // UX Fallback states for manual capture and slow blink responses
  const [showManualFallback, setShowManualFallback] = useState(false);
  const faceDetectedSinceRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await loadFaceApiModels();
        setIsModelLoaded(true);
        setStatus('Ready. Please look at the camera.');
        startCamera();
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Failed to load AI face models.');
      }
    };
    loadModels();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Please allow camera access to proceed.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const calculateEAR = (eye) => {
    const v1 = getDistance(eye[1], eye[5]);
    const v2 = getDistance(eye[2], eye[4]);
    const h = getDistance(eye[0], eye[3]);
    return (v1 + v2) / (2.0 * h);
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      // Draw video mirrored (as seen by the user)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    } catch (e) {
      console.error('Failed to capture frame snapshot:', e);
      return null;
    }
  };

  const processSuccessfulCapture = async () => {
    isScanningRef.current = false;
    setScanning(false);
    if (scanLoopRef.current) clearTimeout(scanLoopRef.current);

    const photoBase64 = captureFrame();
    setStatus('Extracting face features...');

    try {
      if (!videoRef.current) {
        throw new Error('Video stream is no longer available.');
      }

      // Extract high-quality face descriptor only once on liveness success
      const detectorOptions = getDetectorOptions();
      const finalDetection = await faceapi
        .detectSingleFace(videoRef.current, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!finalDetection) {
        throw new Error('Face lost during capture. Please stay still and look at the camera.');
      }

      const descriptorArray = Array.from(finalDetection.descriptor);

      if (mode === 'enroll') {
        setStatus('Checking for duplicates...');
        await axios.post(`${API_BASE_URL}/api/auth/check-duplicate-face`, {
          faceDescriptor: descriptorArray,
          regdNo,
          email,
          role,
          collegeId
        });
        
        setSuccess(true);
        setStatus('Face Captured Successfully!');
        stopCamera();
        setTimeout(() => {
          onCapture(descriptorArray, photoBase64);
        }, 1000);
      } else {
        setStatus('Verifying face with server...');
        await onCapture(descriptorArray);
        setSuccess(true);
        setStatus('Face Verified!');
        stopCamera();
      }
    } catch (serverErr) {
      setError(serverErr.response?.data?.message || serverErr.message || 'Face validation failed.');
      setStatus('Face Rejected.');
      stopCamera();
    }
  };

  const startScanning = () => {
    if (!isModelLoaded || !cameraActive || !videoRef.current) return;
    
    setScanning(true);
    isScanningRef.current = true;
    setError('');
    setStatus('Looking for face...');
    setLivenessProgress(10);
    setFaceDetected(false);
    
    let noFaceCount = 0;
    
    // Reset state machine refs
    livenessStateRef.current = 'CALIBRATING';
    baselineOpenEARRef.current = null;
    baselineFramesRef.current = [];
    lastCloseTimeRef.current = 0;
    calibrationTimeRef.current = 0;

    setBaselineEARState(null);
    setCurrentEAR(null);
    setShowManualFallback(false);
    faceDetectedSinceRef.current = null;

    const startTime = Date.now();
    setTimeLeft(30);

    const scanFrame = async () => {
      try {
        if (!isScanningRef.current) return;
        if (!videoRef.current || !videoRef.current.srcObject) return;

        const elapsedMs = Date.now() - startTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        setTimeLeft(Math.max(0, 30 - elapsedSec));

        if (elapsedSec > 30) {
          setScanning(false);
          isScanningRef.current = false;
          setError('Scanning timed out. Please try again.');
          setStatus('Verification failed due to timeout.');
          stopCamera();
          return;
        }

        // Run face detector + landmarks (descriptor skipped during loop to maximize performance)
        const detectorOptions = getDetectorOptions();
        const detection = await faceapi
          .detectSingleFace(videoRef.current, detectorOptions)
          .withFaceLandmarks();

        if (!detection) {
          noFaceCount++;
          if (noFaceCount > 8) {
            setFaceDetected(false);
            setStatus('No face detected. Please look directly at the camera.');
            setLivenessProgress(10);
            
            // Reset calibration state if face is lost
            livenessStateRef.current = 'CALIBRATING';
            baselineOpenEARRef.current = null;
            baselineFramesRef.current = [];
            setBaselineEARState(null);
            setCurrentEAR(null);
            
            // Reset manual capture variables
            faceDetectedSinceRef.current = null;
            setShowManualFallback(false);
          }
        } else {
          noFaceCount = 0;
          setFaceDetected(true);
          
          if (faceDetectedSinceRef.current === null) {
            faceDetectedSinceRef.current = Date.now();
          } else if (Date.now() - faceDetectedSinceRef.current > 3500) {
            setShowManualFallback(true);
          }

          const landmarks = detection.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          const leftEAR = calculateEAR(leftEye);
          const rightEAR = calculateEAR(rightEye);
          const avgEAR = (leftEAR + rightEAR) / 2.0;
          
          setCurrentEAR(avgEAR);

          // Phase 1: Calibrate open eyes baseline (collect 6 frames)
          if (livenessStateRef.current === 'CALIBRATING') {
            setStatus('Calibrating... Keep eyes open.');
            if (avgEAR > 0.12 && avgEAR < 0.40) {
              baselineFramesRef.current.push(avgEAR);
              setLivenessProgress(15 + baselineFramesRef.current.length * 5);
              if (baselineFramesRef.current.length >= 6) {
                const sum = baselineFramesRef.current.reduce((a, b) => a + b, 0);
                const baseline = sum / baselineFramesRef.current.length;
                baselineOpenEARRef.current = baseline;
                setBaselineEARState(baseline);
                livenessStateRef.current = 'WAIT_CLOSE';
                calibrationTimeRef.current = Date.now();
                setStatus('Please blink naturally to verify.');
                setLivenessProgress(50);
              }
            }
          }
          // Phase 2: Wait for eyes to close (blink start)
          else if (livenessStateRef.current === 'WAIT_CLOSE') {
            // Self-Healing Loop: Recalibrate if stuck waiting for close > 5 seconds
            if (Date.now() - calibrationTimeRef.current > 5000) {
              livenessStateRef.current = 'CALIBRATING';
              baselineOpenEARRef.current = null;
              baselineFramesRef.current = [];
              setBaselineEARState(null);
              setStatus('Recalibrating camera...');
              setLivenessProgress(10);
              scanLoopRef.current = setTimeout(scanFrame, isMobile ? 250 : 150);
              return;
            }

            setStatus('Please blink naturally to verify.');
            setLivenessProgress(60);
            
            // Check for closed eyes: 18% reduction from open eye baseline (highly sensitive but photo-proof)
            const closeThreshold = baselineOpenEARRef.current * 0.82;
            if (avgEAR < closeThreshold) {
              livenessStateRef.current = 'WAIT_OPEN';
              lastCloseTimeRef.current = Date.now();
              setStatus('Blink detected. Processing...');
              setLivenessProgress(80);
            }
          }
          // Phase 3: Wait for eyes to open (blink end)
          else if (livenessStateRef.current === 'WAIT_OPEN') {
            // Stuck prevention: If eyes don't reopen within 1.5s, go back to waiting for close
            if (Date.now() - lastCloseTimeRef.current > 1500) {
              livenessStateRef.current = 'WAIT_CLOSE';
              calibrationTimeRef.current = Date.now(); // Reset baseline timer
              setStatus('Please blink naturally.');
              setLivenessProgress(50);
            } else {
              // Check for reopened eyes: recovered to at least 88% of open baseline
              const openThreshold = baselineOpenEARRef.current * 0.88;
              if (avgEAR >= openThreshold) {
                livenessStateRef.current = 'SUCCESS';
                setLivenessProgress(100);
                processSuccessfulCapture();
                return;
              }
            }
          }
        }
        
        // Polling interval: faster for active blink detection, slower when no face is found
        const delay = detection 
          ? (isMobile ? 100 : 60) 
          : (isMobile ? 250 : 150);
        scanLoopRef.current = setTimeout(scanFrame, delay);

      } catch (err) {
        console.error('Error scanning face:', err);
        scanLoopRef.current = setTimeout(scanFrame, isMobile ? 250 : 150);
      }
    };

    scanFrame();
  };

  useEffect(() => {
    if (isModelLoaded && cameraActive) {
      const timer = setTimeout(() => {
        startScanning();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isModelLoaded, cameraActive]);

  const handleManualCapture = () => {
    if (!faceDetected || success) return;
    setStatus('Capturing face...');
    processSuccessfulCapture();
  };

  const handleRetry = () => {
    setError('');
    setSuccess(false);
    setScanning(false);
    isScanningRef.current = false;
    setFaceDetected(false);
    setLivenessProgress(0);
    setCurrentEAR(null);
    setBaselineEARState(null);
    setShowManualFallback(false);
    faceDetectedSinceRef.current = null;
    if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
    setStatus('Ready. Please look at the camera.');
    if (!cameraActive) {
      startCamera();
    } else {
      startScanning();
    }
  };

  useEffect(() => {
    return () => {
      isScanningRef.current = false;
      if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 my-2 w-full">
      <div className={`relative w-48 h-48 rounded-full overflow-hidden border-4 transition-all duration-300 shadow-inner bg-slate-800 flex items-center justify-center
        ${error ? 'border-red-500 shadow-red-100' : 
          success ? 'border-emerald-500 shadow-emerald-100 animate-pulse' : 
          faceDetected ? 'border-teal-500 shadow-teal-100' : 
          'border-slate-300 shadow-slate-100'}`}
      >
        {!isModelLoaded && !error && (
          <div className="flex flex-col items-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mb-2" />
            <span className="text-xs font-medium">Loading AI...</span>
          </div>
        )}
        
        {error && !success && (
          <div className="flex flex-col items-center text-red-400 px-4 text-center">
            <AlertCircle className="h-8 w-8 mb-2" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="absolute inset-0 bg-emerald-500 flex flex-col items-center justify-center text-white animate-fadeIn">
            <CheckCircle2 className="h-12 w-12 mb-2" />
            <span className="font-semibold text-sm">{mode === 'enroll' ? 'Face Captured' : 'Face Verified'}</span>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`object-cover w-full h-full transform scale-x-[-1] ${(!isModelLoaded || success || error) ? 'hidden' : 'block'}`}
        />
        
        {scanning && !success && !error && (
          <>
            <div className={`absolute inset-2 border-2 border-dashed rounded-full animate-[spin_25s_linear_infinite] pointer-events-none transition-all duration-300
              ${faceDetected ? 'border-teal-400/50' : 'border-slate-500/30'}`}
            ></div>
            <div className={`absolute inset-4 border rounded-full pointer-events-none transition-all duration-300
              ${faceDetected ? 'border-teal-500/20 animate-pulse' : 'border-slate-600/10'}`}
            ></div>
            <div className={`absolute inset-0 border-4 rounded-full pointer-events-none transition-all duration-300
              ${faceDetected ? 'border-teal-500/30 animate-pulse' : 'border-transparent'}`}
            ></div>
          </>
        )}
      </div>

      <div className="text-center w-full px-4">
        <p className={`text-xs font-semibold tracking-wide transition-colors duration-200 ${
          error ? 'text-red-600' : 
          success ? 'text-emerald-600' : 
          faceDetected ? 'text-teal-700' : 'text-slate-500'}`}
        >
          {status}
        </p>

        {scanning && !error && !success && faceDetected && (
          <div className="mt-2 w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden mx-auto border border-slate-200/50">
            <div 
              className="bg-teal-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${livenessProgress}%` }}
            />
          </div>
        )}

        {scanning && !error && !success && (
          <div className="mt-1 flex flex-col items-center">
            <p className="text-[11px] text-rose-500 font-bold tracking-wider">
              Time Left: 00:{timeLeft.toString().padStart(2, '0')}
            </p>
            {/* Real-time Telemetry for Easy Testing & Tuning */}
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Base EAR: {baselineEARState ? baselineEARState.toFixed(3) : 'Calibrating...'} | Current: {currentEAR ? currentEAR.toFixed(3) : '0.000'}
            </p>
          </div>
        )}
      </div>

      {error && !success && (
        <button
          type="button"
          onClick={handleRetry}
          className="mt-2 text-xs font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
        >
          Try Again
        </button>
      )}

      {!success && !error && isModelLoaded && (
        <div className="flex flex-col items-center w-full space-y-3">
          <div className="flex items-center space-x-2 px-6 py-2 bg-slate-100 border border-slate-200/80 text-slate-600 rounded-full text-xs font-semibold shadow-sm select-none">
            {faceDetected ? (
              <>
                <Camera className="h-4 w-4 text-teal-600 animate-pulse" />
                <span>Blink to Capture</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                <span>Waiting for face...</span>
              </>
            )}
          </div>
          
          {faceDetected && (
            <div className="flex flex-col items-center space-y-2 w-full px-4 animate-fadeIn">
              <button
                type="button"
                onClick={handleManualCapture}
                className="w-full max-w-[200px] py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Capture Face</span>
              </button>
              
              {showManualFallback ? (
                <p className="text-[10px] text-rose-500 font-semibold tracking-wide max-w-[240px] text-center leading-relaxed animate-pulse">
                  Blink not detected? Tap the button above to capture manually.
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-medium tracking-wide max-w-[220px] text-center leading-relaxed">
                  The scanner automatically completes when you blink.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceScanner;
