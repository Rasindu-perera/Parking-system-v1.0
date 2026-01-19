import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import GateControl from '../components/GateControl';

const API_URL = 'http://127.0.0.1:8002';

export default function ControllerExit() {
  console.log('🚀 ControllerExit component mounting/rendering');
  
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [searchType, setSearchType] = useState('plate'); // 'plate' or 'qr'
  const [sessionData, setSessionData] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [rfidTag, setRfidTag] = useState('');
  const [rfidValidation, setRfidValidation] = useState(null);
  const [rfidValidating, setRfidValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('Waiting for vehicle...');
  const [cameraDeviceId, setCameraDeviceId] = useState('1');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    fetchGateStatus();
    fetchCameraSettings();
    startAutoDetection();
    return () => {
      console.log('🛑 ControllerExit unmounting - stopping all detection');
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      stopCamera();
      setAutoDetecting(false);
      setLoading(false);
    };
  }, []);

  const fetchCameraSettings = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/camera/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCameraDeviceId(response.data.camera2_device || '1');
    } catch (err) {
      console.error('Failed to fetch camera settings:', err);
    }
  };

  const startCamera = async () => {
    try {
      let constraints;
      if (cameraDeviceId.startsWith('http')) {
        setError('IP cameras require backend streaming support');
        return;
      } else {
        constraints = { 
          video: { 
            deviceId: cameraDeviceId === '1' ? undefined : { exact: cameraDeviceId },
            facingMode: cameraDeviceId === '1' ? 'environment' : undefined
          } 
        };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load before setting active
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 onloadedmetadata fired (Exit)');
          videoRef.current.play().then(() => {
            console.log('✓ Video playing:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            setCameraActive(true);
            setDetectionStatus('Camera ready - Starting detection...');
            
            // Start detection interval once camera is ready
            setTimeout(() => {
              setDetectionStatus('Detection active - Scanning...');
              console.log('Starting auto-detection interval (Exit)');
              detectionIntervalRef.current = setInterval(() => {
                captureAndDetect();
              }, 2000);
            }, 500);
          }).catch(err => {
            console.error('Video play error:', err);
          });
        };
        
        // Fallback: If metadata doesn't fire in 2 seconds, try to play anyway
        setTimeout(() => {
          if (videoRef.current && videoRef.current.videoWidth === 0) {
            console.warn('⚠️ Metadata event did not fire (Exit), attempting to play manually');
            videoRef.current.play().then(() => {
              if (videoRef.current.videoWidth > 0) {
                console.log('✓ Manual play successful:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                setCameraActive(true);
                setDetectionStatus('Camera ready - Starting detection...');
                
                setTimeout(() => {
                  if (!detectionIntervalRef.current) {
                    setDetectionStatus('Detection active - Scanning...');
                    console.log('Starting auto-detection interval (fallback)');
                    detectionIntervalRef.current = setInterval(() => {
                      captureAndDetect();
                    }, 2000);
                  }
                }, 500);
              }
            }).catch(err => {
              console.error('Manual play error:', err);
            });
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Failed to access camera. Please check permissions and settings.');
      setAutoDetecting(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
  };

  const startAutoDetection = async () => {
    setAutoDetecting(true);
    setDetectionStatus('Initializing camera...');
    await startCamera();
  };

  const stopAutoDetection = () => {
    console.log('🛑 Stopping auto-detection...');
    setAutoDetecting(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
      console.log('✓ Detection interval cleared');
    }
    stopCamera();
    setLoading(false);
  };

  const captureAndDetect = async (isManual = false) => {
    console.log('=== captureAndDetect called (Exit) ===', { isManual, loading, autoDetecting });
    
    // Prevent running if detection is stopped or already processing
    if (!autoDetecting && !isManual) {
      console.log('🛑 Detection stopped, skipping capture');
      return;
    }
    
    if (!videoRef.current) {
      console.error('videoRef.current is null');
      setDetectionStatus('⚠️ Camera not ready');
      if (isManual) alert('Camera not ready! Please start the camera first.');
      return;
    }

    if (!videoRef.current.srcObject) {
      console.error('videoRef.current.srcObject is null');
      setDetectionStatus('⚠️ Camera not initialized');
      if (isManual) alert('Camera stream not initialized! Click "Start Auto-Detection" first.');
      return;
    }

    if (loading && !isManual) {
      console.log('Already processing, skipping frame');
      return;
    }

    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) {
      console.error('Video dimensions invalid:', videoWidth, 'x', videoHeight);
      setDetectionStatus('⚠️ Video still loading...');
      if (isManual) {
        alert(`Camera is still initializing. Please wait a moment.\nDimensions: ${videoWidth}x${videoHeight}`);
      }
      return;
    }

    console.log('Capturing frame:', videoWidth, 'x', videoHeight);
    setDetectionStatus('📸 Capturing image...');
    setLoading(true);

    const canvas = document.createElement('canvas');
    // Optimize: resize to 640x480 for faster processing
    const targetWidth = Math.min(videoWidth, 640);
    const targetHeight = Math.min(videoHeight, 480);
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        console.log('Image captured, size:', blob.size, 'bytes');
        setDetectionStatus('🔍 Processing image...');
        
        // Convert blob to File object with proper filename
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        console.log('✓ File object created:', file.name, file.size, 'bytes');
        
        await processExitImage(file, !isManual);
      } else {
        console.error('Failed to create blob from canvas');
        setDetectionStatus('❌ Capture failed');
        setLoading(false);
      }
    }, 'image/jpeg', 0.85);
  };

  const processExitImage = async (imageFile, isAutoCapture = false) => {
    console.log('Processing image, isAutoCapture:', isAutoCapture);
    
    if (!isAutoCapture) {
      setLoading(true);
      console.log('Manual capture - loading set to true');
    }
    setError('');

    try {
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      const formData = new FormData();
      formData.append('file', imageFile);

      console.log('Sending image to backend:', imageFile.size, 'bytes');

      const response = await axios.post(
        `${API_URL}/camera/camera2/capture`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 15000
        }
      );

      console.log('OCR Response:', response.data);

      if (response.data.plate === 'DUPLICATE') {
        console.log('⚠️ Duplicate detection ignored');
        setDetectionStatus('🔍 Scanning for new vehicles...');
        if (!isAutoCapture) setLoading(false);
      } else if (response.data.plate && response.data.plate !== 'UNKNOWN') {
        console.log('✓ Valid plate detected:', response.data.plate);
        
        setPlate(response.data.plate);
        setCapturedImage(response.data.image);
        setDetectionStatus(`✓ Vehicle: ${response.data.plate}`);
        
        // STOP auto-detection
        setAutoDetecting(false);
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
        setCameraActive(true);
        
        // Search for session
        if (!isAutoCapture) {
          setLoading(false);
        }
        handleSearchWithPlate(response.data.plate).catch(searchErr => {
          console.error('Session search error:', searchErr);
          setError('Plate detected but no active session found');
        });
      } else {
        console.log('⚠️ No plate detected');
        
        if (isAutoCapture) {
          setDetectionStatus('🔍 Scanning...');
        } else {
          setPlate('UNKNOWN');
          setCapturedImage(response.data.image);
          setDetectionStatus('⚠️ No plate - Enter manually');
          setError('No plate detected. Please enter manually.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Image processing error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      setLoading(false);
      
      let errorMessage = 'Failed to process image';
      if (err.response?.status === 401 || err.response?.status === 403) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      }
      
      setError(errorMessage);
      setDetectionStatus('❌ ' + errorMessage);
    }
  };

  const fetchGateStatus = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/camera/gates/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGateOpen(response.data.exit_gate.open);
    } catch (err) {
      console.error('Failed to fetch gate status:', err);
    }
  };

  const handleOpenGate = async () => {
    setGateLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`${API_URL}/camera/gates/exit/open`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGateOpen(true);
    } catch (err) {
      setError('Failed to open gate');
    } finally {
      setGateLoading(false);
    }
  };

  const handleCloseGate = async () => {
    setGateLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`${API_URL}/camera/gates/exit/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGateOpen(false);
    } catch (err) {
      setError('Failed to close gate');
    } finally {
      setGateLoading(false);
    }
  };

  const handleSearchWithPlate = async (plateNumber) => {
    setError('');
    setSessionData(null);
    setFeeData(null);

    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/controller/exit/calculate-fee`,
        { plate: plateNumber.toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeeData(response.data);
      setSessionData({ plate: response.data.plate });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to find active session');
    }
  };

  const handleSearch = async () => {
    setError('');
    setSessionData(null);
    setFeeData(null);
    setLoading(true);

    try {
      const token = sessionStorage.getItem('token');

      if (searchType === 'qr') {
        // Search by QR token
        const response = await axios.post(
          `${API_URL}/exit/by-qr`,
          { qr_token: qrToken },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSessionData(response.data);
        // Calculate fee using session_id
        const feeResponse = await axios.post(
          `${API_URL}/controller/exit/calculate-fee`,
          { plate: response.data.plate },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFeeData(feeResponse.data);
      } else {
        // Search by plate and calculate fee
        await handleSearchWithPlate(plate);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to find active session');
    } finally {
      setLoading(false);
    }
  };

  const validateRfidAccount = async () => {
    if (!rfidTag || !rfidTag.trim()) {
      setError('Please enter RFID number');
      return;
    }

    if (!plate || !plate.trim()) {
      setError('Please search for vehicle first to get plate number');
      return;
    }

    setError('');
    setRfidValidation(null);
    setRfidValidating(true);

    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/rfid/validate`,
        {
          rfid_number: rfidTag.trim(),
          plate_number: plate.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✓ RFID validated:', response.data);
      setRfidValidation(response.data);
      
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'RFID validation failed';
      setError(errorMessage);
      setRfidValidation(null);
      console.error('✗ RFID validation error:', errorMessage);
    } finally {
      setRfidValidating(false);
    }
  };

  const handlePayment = async () => {
    setError('');
    setSuccess(null);

    // Validate RFID if payment method is RFID
    if (paymentMethod === 'rfid') {
      if (!rfidValidation || rfidValidation.rfid_number !== rfidTag.trim()) {
        setError('Please validate RFID account first by clicking "Validate RFID"');
        return;
      }
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem('token');
      const username = sessionStorage.getItem('username') || 'controller';

      console.log('Fee Data:', feeData);
      console.log('Session Data:', sessionData);
      console.log('Session ID for payment:', feeData.session_id || sessionData.session_id);

      let response;
      if (paymentMethod === 'cash') {
        const payload = {
          session_id: feeData.session_id || sessionData.session_id,
          cashier: username
        };
        console.log('Cash payment payload:', payload);
        
        response = await axios.post(
          `${API_URL}/payments/cash`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (paymentMethod === 'card') {
        const payload = {
          session_id: feeData.session_id || sessionData.session_id,
          cashier: username
        };
        console.log('Card payment payload:', payload);
        
        response = await axios.post(
          `${API_URL}/payments/card`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const payload = {
          session_id: feeData.session_id || sessionData.session_id,
          rfid_tag: rfidTag
        };
        console.log('RFID payment payload:', payload);
        
        response = await axios.post(
          `${API_URL}/payments/rfid`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      console.log('✓ Payment successful:', response.data);
      
      const exitTime = new Date().toISOString();
      
      const successData = {
        plate: plate,
        entry_time: feeData.entry_time,
        exit_time: exitTime,
        duration: feeData.duration,
        fee_lkr: feeData.fee_lkr,
        payment_method: response.data.payment_method,
        session_id: feeData.session_id
      };
      
      console.log('🎉 Setting success state with:', successData);
      setSuccess(successData);
      
      // Print detailed exit receipt after a brief delay
      setTimeout(() => {
        printExitReceipt({
          plate: plate,
          entry_time: feeData.entry_time,
          exit_time: exitTime,
          duration: feeData.duration,
          fee: feeData.fee_lkr,
          payment_method: response.data.payment_method,
          session_id: feeData.session_id
        });
      }, 500);
      
      // Auto-open exit gate
      console.log('🚪 Opening exit gate...');
      await handleOpenGate();
      
      // Auto-close gate after 10 seconds
      setTimeout(async () => {
        console.log('🚪 Closing exit gate...');
        await handleCloseGate();
      }, 10000);
      
      // Don't auto-reset - let user see success message
      // User can manually click "Process Next Vehicle" or gate will close after 10s
    } catch (err) {
      console.error('Payment error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const printExitReceipt = (exitData) => {
    console.log('Printing exit receipt for:', exitData);
    
    // Create receipt content as formatted text
    const receiptText = `
  SMART PARKING SYSTEM

========================================
         EXIT RECEIPT
    Parking Payment Confirmation
========================================

License Plate:    ${exitData.plate || 'N/A'}
Session ID:       ${exitData.session_id || 'N/A'}
Entry Time:       ${exitData.entry_time ? new Date(exitData.entry_time).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A'}
Exit Time:        ${exitData.exit_time ? new Date(exitData.exit_time).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : new Date().toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
Duration:         ${exitData.duration || 'N/A'}
Payment Method:   ${exitData.payment_method ? exitData.payment_method.toUpperCase() : 'N/A'}

========================================
TOTAL FEE:        LKR ${exitData.fee ? exitData.fee.toFixed(2) : '0.00'}
========================================

✓ Exit gate opened automatically
Have a safe journey!

Printed: ${new Date().toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
========================================
    `;

    // Open print window with simple text format - same as entry page
    // Use try-catch to prevent any errors from breaking the UI
    try {
      const printWindow = window.open('', '_blank', 'width=400,height=600,left=100,top=100');
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Exit Receipt - ${exitData.plate}</title>
              <style>
                body { 
                  font-family: 'Courier New', monospace; 
                  padding: 20px;
                  white-space: pre-wrap;
                  font-size: 14px;
                }
                @media print {
                  body { margin: 0; padding: 10px; }
                }
              </style>
            </head>
            <body>${receiptText}
              <script>
                window.onload = function() {
                  setTimeout(() => {
                    window.print();
                  }, 100);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Keep focus on main window
        window.focus();
        
        console.log('✓ Exit receipt opened in new window');
      } else {
        console.warn('⚠️ Popup blocked - Receipt data logged');
        console.log('Receipt:\n' + receiptText);
      }
    } catch (e) {
      console.error('❌ Print error:', e);
      console.log('Receipt data:\n' + receiptText);
    }
  };

  const resetFormAndRestartDetection = () => {
    console.log('🔄 Resetting exit form and restarting detection...');
    setPlate('');
    setQrToken('');
    setSessionData(null);
    setFeeData(null);
    setRfidTag('');
    setRfidValidation(null);
    setCapturedImage(null);
    setError('');
    setSuccess(null);
    // Restart auto-detection for the next vehicle
    startAutoDetection();
  };

  console.log('🎨 Rendering ControllerExit - success state:', success);
  console.log('🎨 Rendering ControllerExit - feeData state:', feeData);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Process Exit</h1>
              <p className="text-gray-600 mt-2">Calculate fees and process vehicle exit</p>
            </div>
            <button
              onClick={() => navigate('/controller')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              ← Back
            </button>
          </div>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="text-green-600 text-4xl mr-4">✓</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Payment Processed Successfully</h3>
                <div className="space-y-1 text-sm text-green-800">
                  <p><strong>Plate Number:</strong> {success?.plate || 'N/A'}</p>
                  <p><strong>Session ID:</strong> {success?.session_id || 'N/A'}</p>
                  <p><strong>Entry Time:</strong> {success?.entry_time ? new Date(success.entry_time).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A'}</p>
                  <p><strong>Exit Time:</strong> {success?.exit_time ? new Date(success.exit_time).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A'}</p>
                  <p><strong>Duration:</strong> {success?.duration || 'N/A'}</p>
                  <p><strong>Fee:</strong> LKR {success?.fee_lkr || '0.00'}</p>
                  <p><strong>Payment Method:</strong> {success?.payment_method ? success.payment_method.toUpperCase() : 'N/A'}</p>
                  <p className="text-green-700 font-semibold mt-2">✓ Receipt printed & Exit gate opened</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={resetFormAndRestartDetection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition font-semibold"
              >
                Process Next Vehicle →
              </button>
            </div>
          </div>
        ) : null}

        {/* Gate Control - Always show */}
        <GateControl
          gate="exit"
          isOpen={gateOpen}
          onOpen={handleOpenGate}
          onClose={handleCloseGate}
          loading={gateLoading}
        />

        {/* Camera Section - Only show if not in success state */}
        {!success && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">📷 Camera 2 - Exit Gate Monitoring</h2>
            <div className="flex items-center space-x-2">
              {autoDetecting && (
                <span className="flex items-center text-green-600 text-sm font-semibold">
                  <span className="w-3 h-3 bg-green-600 rounded-full mr-2 animate-pulse"></span>
                  AUTO-DETECTING
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Live Camera Feed */}
            {autoDetecting && (
              <div className="relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  muted
                  className="w-full max-w-2xl rounded-lg border-4 border-blue-500 shadow-lg"
                />
                <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm">
                  {detectionStatus}
                </div>
              </div>
            )}
            
            {/* Captured Image */}
            {capturedImage && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Detected Vehicle:</p>
                <img src={capturedImage} alt="Detected vehicle" className="w-full max-w-md rounded-lg border border-green-500 shadow-md" />
              </div>
            )}
            
            {/* Control Buttons */}
            <div className="flex space-x-3">
              {autoDetecting ? (
                <>
                  <button
                    onClick={stopAutoDetection}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center"
                  >
                    ⏸️ Stop Auto-Detection
                  </button>
                  <button
                    onClick={() => {
                      console.log('🔴 CAPTURE NOW BUTTON CLICKED (Exit)!');
                      console.log('Current state:', { loading, cameraActive, autoDetecting });
                      captureAndDetect(true);
                    }}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center"
                  >
                    {loading ? '⏳ Processing...' : '📸 Capture Now'}
                  </button>
                </>
              ) : (
                <button
                  onClick={startAutoDetection}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center"
                >
                  ▶️ Start Auto-Detection
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>🤖 Automatic Detection:</strong> Camera continuously monitors exit area. When a vehicle is detected, it automatically captures image, extracts license plate, finds parking session, and calculates fees. Review the information and click "Process Payment" to complete exit.
            </p>
          </div>
        </div>
        )}

        {/* Search and Payment Section - Only show if not in success state */}
        {!success && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Search Vehicle</h2>
          
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setSearchType('plate')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  searchType === 'plate'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                By Plate Number
              </button>
              <button
                onClick={() => setSearchType('qr')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  searchType === 'qr'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                By QR Token
              </button>
            </div>

            {searchType === 'plate' ? (
              <div>
                <label htmlFor="plate" className="block text-sm font-medium text-gray-700 mb-2">
                  License Plate Number
                </label>
                <input
                  id="plate"
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition uppercase"
                  placeholder="ABC-1234"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="qrToken" className="block text-sm font-medium text-gray-700 mb-2">
                  QR Token
                </label>
                <input
                  id="qrToken"
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="Enter QR token"
                />
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={loading || (searchType === 'plate' ? !plate : !qrToken)}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Searching...' : 'Search & Calculate Fee'}
            </button>
          </div>
        </div>
        )}

        {!success && feeData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Fee Calculation</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Plate Number:</span>
                <span className="font-semibold">{feeData.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Entry Time:</span>
                <span className="font-semibold">{new Date(feeData.entry_time).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Exit Time:</span>
                <span className="font-semibold">{new Date(feeData.exit_time).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-primary-700 pt-2 border-t">
                <span>Total Fee:</span>
                <span>LKR {feeData.fee_lkr}</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Payment Method</h3>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    paymentMethod === 'cash'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    paymentMethod === 'card'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  💳 Card
                </button>
                <button
                  onClick={() => setPaymentMethod('rfid')}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    paymentMethod === 'rfid'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🎫 RFID Pass
                </button>
              </div>

              {paymentMethod === 'rfid' && (
                <div className="space-y-3">
                  <label htmlFor="rfidTag" className="block text-sm font-medium text-gray-700 mb-2">
                    RFID Tag Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="rfidTag"
                      type="text"
                      value={rfidTag}
                      onChange={(e) => {
                        setRfidTag(e.target.value);
                        setRfidValidation(null); // Clear validation when tag changes
                      }}
                      required={paymentMethod === 'rfid'}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                      placeholder="Enter RFID number (e.g., RFID-xxxxx)"
                    />
                    <button
                      type="button"
                      onClick={validateRfidAccount}
                      disabled={!rfidTag.trim() || rfidValidating}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition"
                    >
                      {rfidValidating ? '⏳' : '✓ Validate'}
                    </button>
                  </div>
                  
                  {rfidValidation && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <span className="text-green-600 text-xl mr-3">✓</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-800 mb-1">Valid RFID Account ✓</h4>
                          <p className="text-sm text-green-700 mb-2">
                            <strong>{rfidValidation.full_name}</strong> - Monthly Pass Holder
                          </p>
                          <div className="text-xs text-green-600 space-y-1">
                            <p>✓ Vehicle <strong>{rfidValidation.matched_plate}</strong> is registered</p>
                            <p>✓ Valid until: {new Date(rfidValidation.valid_to).toLocaleDateString()}</p>
                            <p>Total Registered Vehicles: {rfidValidation.vehicles.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={loading || (paymentMethod === 'rfid' && !rfidTag)}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg"
              >
                {loading ? 'Processing...' : 'Process Payment & Exit'}
              </button>
            </div>
          </div>
        )}

        {!success && error && !feeData && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </Layout>
  );
}
