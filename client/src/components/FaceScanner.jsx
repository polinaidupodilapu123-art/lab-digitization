import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';

const FaceScanner = ({ onCapture, mode = 'enroll' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState('Loading AI Models...');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  
  // Debug states to figure out why it's getting stuck
  const [debugEAR, setDebugEAR] = useState(0);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
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

  const livenessStateRef = useRef('WAIT_OPEN');
  const scanLoopRef = useRef(null);

  const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const calculateEAR = (eye) => {
    const v1 = getDistance(eye[1], eye[5]);
    const v2 = getDistance(eye[2], eye[4]);
    const h = getDistance(eye[0], eye[3]);
    return (v1 + v2) / (2.0 * h);
  };

  const processSuccessfulCapture = async (detection) => {
    if (mode === 'enroll') {
      setStatus('Checking for duplicates...');
      try {
        const descriptorArray = Array.from(detection.descriptor);
        await axios.post(`${API_BASE_URL}/api/auth/check-duplicate-face`, {
          faceDescriptor: descriptorArray
        });
        
        // If unique, proceed with success
        setSuccess(true);
        setStatus('Face Captured Successfully!');
        stopCamera();
        setTimeout(() => {
          onCapture(descriptorArray);
        }, 1000);
      } catch (serverErr) {
        // If duplicate, turn red instantly and block
        setScanning(false);
        setError(serverErr.response?.data?.message || 'Face validation failed.');
        setStatus('Face Rejected.');
      }
    } else {
      // verify mode
      setStatus('Verifying face with server...');
      try {
        await onCapture(Array.from(detection.descriptor));
        setSuccess(true);
        setStatus('Face Verified!');
        stopCamera();
      } catch (serverErr) {
        setScanning(false);
        setError(serverErr.message || 'Face Verification Failed');
        setStatus('Verification failed. Try again.');
      }
    }
  };

  const captureFace = () => {
    if (!isModelLoaded || !cameraActive || !videoRef.current) return;
    
    setScanning(true);
    setError('');
    setStatus('Looking for face...');
    livenessStateRef.current = 'WAIT_OPEN';
    let noFaceCount = 0;

    const startTime = Date.now();
    setTimeLeft(30);

    const scanFrame = async () => {
      try {
        // If the component stopped scanning (e.g. error or success), break loop
        if (!videoRef.current || !videoRef.current.srcObject) return;

        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        setTimeLeft(Math.max(0, 30 - elapsedSec));

        // Check timeout (30 seconds)
        if (elapsedSec > 30) {
          setScanning(false);
          setError('Scanning timed out. Please try again.');
          setStatus('Verification failed due to timeout.');
          return; // Break the loop
        }

        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          noFaceCount++;
          if (noFaceCount > 10) {
            setStatus('No face detected. Please look directly at the camera.');
          }
        } else {
          noFaceCount = 0;
          
          if (livenessStateRef.current === 'WAIT_OPEN') {
            setStatus('Please look directly at the camera...');
          } else if (livenessStateRef.current === 'WAIT_CLOSED') {
            setStatus('Face detected! Please close your eyes slowly...');
          } else if (livenessStateRef.current === 'BLINKED') {
            setStatus('Eyes closed! You can open them now...');
          }

          const landmarks = detection.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          const leftEAR = calculateEAR(leftEye);
          const rightEAR = calculateEAR(rightEye);
          const avgEAR = (leftEAR + rightEAR) / 2.0;
          
          setDebugEAR(avgEAR); // Update UI debug value

          // Loosen anti-wink threshold to avoid false blocking in bad lighting
          const isWink = Math.abs(leftEAR - rightEAR) > 0.15;

          if (livenessStateRef.current === 'WAIT_OPEN') {
            if (leftEAR >= 0.25 && rightEAR >= 0.25) {
              livenessStateRef.current = 'WAIT_CLOSED';
            }
          } else if (livenessStateRef.current === 'WAIT_CLOSED') {
            // Force BOTH eyes to be shut. This completely prevents winking.
            if (leftEAR <= 0.24 && rightEAR <= 0.24) { 
              livenessStateRef.current = 'BLINKED';
            }
          } else if (livenessStateRef.current === 'BLINKED') {
            if (leftEAR >= 0.25 && rightEAR >= 0.25) {
              // Full blink completed
              processSuccessfulCapture(detection);
              return; // Stop the loop
            }
          }
        }
        
        // Give the browser time to process user clicks (like the Cancel button) before starting the next heavy AI calculation
        scanLoopRef.current = setTimeout(scanFrame, 150);

      } catch (err) {
        console.error('Error scanning face:', err);
        // keep trying
        scanLoopRef.current = setTimeout(scanFrame, 250);
      }
    };

    scanFrame();
  };

  const handleRetry = () => {
    setError('');
    setSuccess(false);
    setScanning(false);
    if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
    setStatus('Ready. Please look at the camera.');
    if (!cameraActive) startCamera();
  };

  // Ensure loop is cleared on unmount
  useEffect(() => {
    return () => {
      if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 my-2">
      <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-800 flex items-center justify-center">
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
          <div className="absolute inset-0 bg-teal-500 flex flex-col items-center justify-center text-white animate-fadeIn">
            <CheckCircle2 className="h-12 w-12 mb-2" />
            <span className="font-semibold text-sm">Face Captured</span>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onPlay={() => {
            canvasRef.current = faceapi.createCanvasFromMedia(videoRef.current);
          }}
          className={`object-cover w-full h-full transform scale-x-[-1] ${(!isModelLoaded || success || error) ? 'hidden' : 'block'}`}
        />
        
        {scanning && !success && !error && (
          <>
            <div className="absolute inset-0 border-4 border-teal-500 rounded-full animate-ping opacity-75 pointer-events-none"></div>
            
            {/* DEBUG OVERLAY - Helps us see what the AI is seeing! */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-md font-mono tracking-wider z-50 whitespace-nowrap">
              EAR: {debugEAR.toFixed(3)} | ST: {livenessStateRef.current}
            </div>
          </>
        )}
      </div>

      <div className="text-center">
        <p className={`text-xs font-semibold ${error ? 'text-red-600' : success ? 'text-teal-600' : 'text-slate-500'}`}>
          {status}
        </p>
        {scanning && !error && !success && (
          <p className="text-xs text-rose-500 font-bold mt-1 tracking-wider animate-pulse">
            00:{timeLeft.toString().padStart(2, '0')}
          </p>
        )}
      </div>

      {error && !success && (
        <button
          type="button"
          onClick={handleRetry}
          className="mt-2 text-xs font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2"
        >
          Try Again
        </button>
      )}

      {!success && !error && isModelLoaded && (
        <button
          type="button"
          onClick={captureFace}
          disabled={scanning || !cameraActive}
          className="flex items-center space-x-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-full text-sm font-semibold transition-all shadow-md"
        >
          {scanning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              <span>{mode === 'enroll' ? 'Capture Face' : 'Verify Face'}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default FaceScanner;
