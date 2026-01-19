import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import Layout from '../components/Layout';
import GateControl from '../components/GateControl';

const API_URL = 'http://127.0.0.1:8002';

export default function ControllerEntry() {
  console.log('🚀 ControllerEntry component mounting/rendering');
  
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [spotLabel, setSpotLabel] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [availableSpots, setAvailableSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('Waiting for vehicle...');
  const [cameraDeviceId, setCameraDeviceId] = useState('0');
  const [mobileBookingMode, setMobileBookingMode] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [bookingValidation, setBookingValidation] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    fetchVehicleTypes();
    fetchAvailableSpots();
    fetchGateStatus();
    fetchCameraSettings();
    startAutoDetection();
    return () => {
      console.log('🛑 ControllerEntry unmounting - stopping all detection');
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      stopCamera();
      setAutoDetecting(false);
      setLoading(false);
    };
  }, []);

  useEffect(() => {
    if (typeCode) {
      fetchAvailableSpots();
    }
  }, [typeCode]);

  useEffect(() => {
    // Refresh spots when switching between modes
    fetchAvailableSpots();
  }, [mobileBookingMode]);

  const fetchVehicleTypes = async () => {
    try {
      const token = sessionStorage.getItem('token');
      console.log('Fetching vehicle types with token:', token);
      const response = await axios.get(`${API_URL}/admin/fees/vehicle-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Vehicle types response:', response.data);
      setVehicleTypes(response.data);
    } catch (err) {
      console.error('Failed to fetch vehicle types:', err);
      setError('Failed to load vehicle types. Please refresh the page.');
    }
  };

  const fetchAvailableSpots = async () => {
    try {
      const token = sessionStorage.getItem('token');
      console.log('Fetching spots with token:', token);
      const response = await axios.get(`${API_URL}/admin/spots/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Spots response:', response.data);
      
      // Filter spots based on mode
      const filtered = response.data.filter(spot => {
        const isOccupied = spot.is_occupied === true || spot.is_occupied === 1;
        const isBooked = spot.booking === true || spot.booking === 1;
        
        // Normal Mode: Show spots that are NOT occupied AND NOT booked
        // Mobile Booking Mode: Show spots that are booked (booking=1) OR not occupied
        let shouldShow;
        
        if (mobileBookingMode) {
          // In booking mode: show spots with booking=1 (even if not occupied)
          // OR spots that are completely free (not occupied and not booked)
          shouldShow = isBooked || (!isOccupied && !isBooked);
        } else {
          // In normal mode: ONLY show spots that are not occupied AND not booked
          shouldShow = !isOccupied && !isBooked;
        }
        
        if (typeCode) {
          const selectedType = vehicleTypes.find(vt => vt.code === typeCode);
          return shouldShow && selectedType && spot.type_id === selectedType.id;
        }
        return shouldShow;
      });
      
      console.log(`Filtered spots (${mobileBookingMode ? 'Mobile Booking Mode' : 'Normal Mode'}):`, filtered);
      console.log(`  Total spots: ${response.data.length}, Filtered: ${filtered.length}`);
      setAvailableSpots(filtered);
    } catch (err) {
      console.error('Failed to fetch spots:', err);
      setError('Failed to load parking spots. Please refresh the page.');
    }
  };

  const fetchCameraSettings = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/camera/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCameraDeviceId(response.data.camera1_device || '0');
    } catch (err) {
      console.error('Failed to fetch camera settings:', err);
    }
  };

  const startCamera = async () => {
    try {
      let constraints;
      if (cameraDeviceId.startsWith('http')) {
        // IP camera URL - not directly supported by browser, would need backend streaming
        setError('IP cameras require backend streaming support');
        return;
      } else {
        // Device ID (0, 1, 2, etc.)
        constraints = { 
          video: { 
            deviceId: cameraDeviceId === '0' ? undefined : { exact: cameraDeviceId },
            facingMode: cameraDeviceId === '0' ? 'environment' : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load before setting active
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 onloadedmetadata fired');
          videoRef.current.play().then(() => {
            console.log('✓ Video playing:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            setCameraActive(true);
            setDetectionStatus('Camera ready - Starting detection...');
            
            // Start detection interval once camera is ready
            setTimeout(() => {
              setDetectionStatus('Detection active - Scanning...');
              console.log('Starting auto-detection interval (Entry)');
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
            console.warn('⚠️ Metadata event did not fire, attempting to play manually');
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
    console.log('=== captureAndDetect called ===', { isManual, loading, autoDetecting });
    
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

    console.log('✓ Starting capture:', videoWidth, 'x', videoHeight);
    setDetectionStatus('📸 Capturing image...');
    setLoading(true);

    try {
      const canvas = document.createElement('canvas');
      // Optimize: resize to 640x480 for faster processing
      const targetWidth = Math.min(videoWidth, 640);
      const targetHeight = Math.min(videoHeight, 480);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);
      
      console.log('✓ Canvas created, converting to blob...');
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          console.log('✓ Image captured, size:', blob.size, 'bytes');
          setDetectionStatus('🔍 Processing image...');
          
          // Convert blob to File object with proper filename
          const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
          console.log('✓ File object created:', file.name, file.size, 'bytes');
          
          await processImage(file, !isManual);
        } else {
          console.error('❌ Failed to create blob from canvas');
          setDetectionStatus('❌ Capture failed');
          alert('Failed to create image blob!');
          setLoading(false);
        }
      }, 'image/jpeg', 0.85);
    } catch (error) {
      console.error('❌ Exception in captureAndDetect:', error);
      setDetectionStatus('❌ Capture error');
      alert('Error capturing image: ' + error.message);
      setLoading(false);
    }
  };

  const processImage = async (imageFile, isAutoCapture = false) => {
    console.log('=== processImage called ===', { 
      imageSize: imageFile?.size, 
      imageType: imageFile?.type,
      isAutoCapture 
    });
    
    setError('');

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        alert('Authentication error! Please log in again.');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', imageFile);

      console.log('✓ Sending image to backend...', {
        url: `${API_URL}/camera/camera1/capture`,
        imageSize: imageFile.size,
        token: token.substring(0, 20) + '...'
      });
      
      const response = await axios.post(
        `${API_URL}/camera/camera1/capture`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 second timeout to allow OCR processing to complete
        }
      );

      console.log('✓ Backend response received:', response.data);
      console.log('Response status:', response.status);
      console.log('Response plate:', response.data.plate);
      console.log('Response type_code:', response.data.type_code);
      console.log('Response spot_label:', response.data.spot_label);
      console.log('Response image length:', response.data.image?.length);
      console.log('Is auto-capture?', isAutoCapture);

      if (response.data.plate === 'DUPLICATE') {
        // Duplicate detection
        console.log('⚠️ Duplicate detection:', response.data.message);
        
        if (isAutoCapture) {
          // During auto-detection: ignore and keep scanning
          setDetectionStatus('🔍 Scanning for new vehicles...');
          console.log('Auto-detection continuing, ignoring duplicate...');
        } else {
          // Manual capture: show warning but allow override
          setDetectionStatus('⚠️ Duplicate vehicle detected recently');
          setError(`Warning: ${response.data.message || 'This vehicle was recently processed.'}\nYou can still proceed if this is a different entry.`);
        }
      } else if (response.data.plate && response.data.plate !== 'UNKNOWN') {
        // Valid plate detected
        console.log('✓ Valid plate detected:', response.data.plate);
        
        // Check if mobile booking mode is active - auto-search for booking
        if (mobileBookingMode) {
          console.log('📱 Mobile Booking Mode: Auto-searching for booking with plate:', response.data.plate);
          setDetectionStatus(`📱 Plate detected: ${response.data.plate} - Checking for mobile booking...`);
          setPlate(response.data.plate);
          setCapturedImage(response.data.image);
          
          // Auto-search for mobile booking
          try {
            const token = sessionStorage.getItem('token');
            const bookingResponse = await axios.get(
              `${API_URL}/mobile/bookings/search-by-plate?plate_number=${response.data.plate.toUpperCase()}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            console.log('✓ Mobile booking found:', bookingResponse.data);
            setQrInput(bookingResponse.data.qr_code_data);
            
            // Validate the booking
            await validateMobileBooking(bookingResponse.data.qr_code_data);
            
            // Stop OCR detection after successful mobile booking validation
            setAutoDetecting(false);
            if (detectionIntervalRef.current) {
              clearInterval(detectionIntervalRef.current);
              detectionIntervalRef.current = null;
              console.log('✓ OCR detection stopped after mobile booking validation');
            }
          } catch (bookingErr) {
            console.log('⚠️ No mobile booking found for plate:', response.data.plate);
            setDetectionStatus(`⚠️ No mobile booking found for ${response.data.plate} - Use regular entry`);
            setError(`No active mobile booking found for ${response.data.plate}. Please use regular entry process or verify the vehicle has a valid booking.`);
            
            // Fill form with OCR data for regular entry
            setTypeCode(response.data.type_code);
            setSpotLabel(response.data.spot_label);
            setCapturedImage(response.data.image);
          }
        } else {
          // Regular OCR mode - fill form and STOP detection
          console.log('🛑 Stopping OCR detection - form is ready for submission');
          
          setPlate(response.data.plate);
          setTypeCode(response.data.type_code);
          setSpotLabel(response.data.spot_label);
          setCapturedImage(response.data.image);
          setDetectionStatus(`✓ Vehicle detected: ${response.data.plate} - Form filled, ready to submit`);
          
          // STOP auto-detection interval only (keep camera on for visual reference)
          setAutoDetecting(false);
          if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
            console.log('✓ OCR detection interval cleared (form filled)');
          }
          // Keep camera active for visual reference
          setCameraActive(true);
          
          setSuccess(`✓ Vehicle detected! Plate: ${response.data.plate}\nForm filled - Review and click "Create Entry".`);
        }
      } else {
        // No plate detected
        console.log('⚠️ No plate detected in image');
        
        if (isAutoCapture) {
          // During auto-detection: don't fill form, keep trying
          setDetectionStatus('🔍 Scanning... No license plate found');
          console.log('Auto-detection continuing, waiting for valid plate...');
        } else {
          // Manual capture: fill form with defaults for user to correct
          setPlate(response.data.plate || 'UNKNOWN');
          setTypeCode(response.data.type_code || 'CAR');
          setSpotLabel(response.data.spot_label || '');
          setCapturedImage(response.data.image);
          setDetectionStatus('⚠️ No plate detected - Form filled with defaults');
          setError('No license plate detected. Form filled with default values - please correct manually and submit.');
          
          // Stop auto-detection interval (keep camera on for reference)
          setAutoDetecting(false);
          if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
            console.log('✓ Detection stopped for manual correction');
          }
          // Keep camera active
          setCameraActive(true);
        }
      }
    } catch (err) {
      console.error('❌ Image processing error:', err);
      console.error('Error message:', err.message);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      
      if (!isAutoCapture) {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to process vehicle image';
        setError(errorMessage);
        setDetectionStatus('❌ Processing failed');
        console.error('Manual capture failed with error:', errorMessage);
      } else {
        setDetectionStatus('❌ Processing error - Monitoring...');
        console.log('Auto-detection error, continuing to monitor...');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGateStatus = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/camera/gates/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGateOpen(response.data.entry_gate.open);
    } catch (err) {
      console.error('Failed to fetch gate status:', err);
    }
  };

  const handleOpenGate = async () => {
    setGateLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`${API_URL}/camera/gates/entry/open`, {}, {
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
      await axios.post(`${API_URL}/camera/gates/entry/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGateOpen(false);
    } catch (err) {
      setError('Failed to close gate');
    } finally {
      setGateLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const token = sessionStorage.getItem('token');
      
      const payload = {
        plate: plate.toUpperCase(),
        type_code: typeCode,
        spot_label: spotLabel
      };
      
      console.log('Submitting entry session with payload:', payload);

      const response = await axios.post(`${API_URL}/entry/create-session`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✓ Entry created successfully:', response.data);
      setSuccess(response.data);
      
      // Print receipt
      printReceipt(response.data);

      // Auto-open gate
      console.log('🚪 Opening entry gate...');
      await handleOpenGate();
      
      // Auto-close gate after 10 seconds
      setTimeout(async () => {
        console.log('🚪 Closing entry gate...');
        await handleCloseGate();
      }, 10000);

      // Clear form and restart auto-detection for the next vehicle
      setTimeout(() => {
        resetFormAndRestartDetection();
      }, 1000);

    } catch (err) {
      console.error('Failed to create session:', err);
      setError(err.response?.data?.detail || 'Failed to create entry session');
    } finally {
      setLoading(false);
    }
  };

  const resetFormAndRestartDetection = () => {
    console.log('🔄 Resetting form and restarting detection...');
    setPlate('');
    setTypeCode('');
    setSpotLabel('');
    setCapturedImage(null);
    setError('');
    setSuccess(null);
    setBookingValidation(null);
    setQrInput('');
    
    // Only restart auto-detection in normal mode, NOT in booking mode
    if (!mobileBookingMode) {
      console.log('✓ Normal mode: Restarting auto-detection for next vehicle');
      setDetectionStatus('✓ Ready for next vehicle - Starting detection...');
      startAutoDetection();
    } else {
      console.log('📱 Booking mode: Form cleared, detection stopped');
      setDetectionStatus('📱 Booking mode ready - Use QR/Plate search or manual capture');
      // Keep camera and detection stopped in booking mode
      stopAutoDetection();
    }
  };

  const handleManualCapture = () => {
    console.log('📸 Manual capture button clicked');
    captureAndDetect(true);
  };

  const printReceipt = async (session) => {
    console.log('Printing entry receipt for:', session);
    
    try {
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(session.qr_token || 'N/A', {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Open print window with QR code
      const printWindow = window.open('', '_blank', 'width=400,height=700');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Entry Receipt - ${session.plate}</title>
              <style>
                body { 
                  font-family: 'Courier New', monospace; 
                  padding: 20px;
                  text-align: center;
                  font-size: 13px;
                }
                .header {
                  font-size: 16px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .divider {
                  border-top: 2px dashed #000;
                  margin: 10px 0;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 5px 0;
                  text-align: left;
                }
                .label {
                  font-weight: bold;
                }
                .qr-section {
                  margin: 20px 0;
                  padding: 15px;
                  border: 2px solid #000;
                }
                .qr-code {
                  margin: 10px auto;
                }
                .footer {
                  margin-top: 15px;
                  font-size: 11px;
                }
                @media print {
                  body { margin: 0; padding: 10px; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div style="text-align: center; margin-bottom: 10px;">
                  <div style="font-weight: bold; font-size: 14px;">SMART PARKING SYSTEM</div>
                </div>
                ========================================<br>
                PARKING ENTRY RECEIPT<br>
                Vehicle Entry Confirmation<br>
                ========================================
              </div>
              
              <div style="margin: 15px 0;">
                <div class="info-row">
                  <span class="label">License Plate:</span>
                  <span>${session.plate || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Vehicle Type:</span>
                  <span>${session.type_code || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Spot Label:</span>
                  <span>${session.spot_label || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Entry Time:</span>
                  <span>${session.entry_time ? new Date(session.entry_time).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Session ID:</span>
                  <span>${session.session_id || 'N/A'}</span>
                </div>
              </div>

              <div class="divider"></div>

              <div class="qr-section">
                <div style="font-weight: bold; margin-bottom: 10px;">
                  SCAN FOR EXIT
                </div>
                <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
                <div style="font-size: 10px; margin-top: 10px; word-break: break-all;">
                  Token: ${session.qr_token || 'N/A'}
                </div>
              </div>

              <div class="divider"></div>

              <div class="footer">
                ✓ Entry gate opened automatically<br>
                Please keep this receipt for exit<br><br>
                Printed: ${new Date().toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}<br>
                ========================================
              </div>

              <script>
                window.onload = function() {
                  setTimeout(() => {
                    window.print();
                  }, 250);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        console.warn('⚠️ Popup blocked - Receipt data logged');
        console.log('QR Token:', session.qr_token);
      }
    } catch (e) {
      console.error('Print error:', e);
      console.log('Receipt data:', session);
    }
  };

  const handleClear = () => {
    setPlate('');
    setTypeCode('');
    setSpotLabel('');
    setCapturedImage(null);
    setError('');
    setSuccess(null);
    setBookingValidation(null);
    setQrInput('');
    // After clearing, restart detection
    startAutoDetection();
  };

  const validateMobileBooking = async (qrData) => {
    setLoading(true);
    setError('');
    setBookingValidation(null);

    try {
      const token = sessionStorage.getItem('token');
      console.log('Validating mobile booking:', qrData);

      const response = await axios.post(
        `${API_URL}/mobile/validate-qr`,
        { qr_data: qrData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Validation response:', response.data);

      if (response.data.valid) {
        // Get booking data from validation response
        let plateNumber = response.data.plate_number;
        
        // Format plate number: "CAV 8537-A" -> "CAV-8537"
        // Remove everything after the last digit
        plateNumber = plateNumber.replace(/\s+/g, '-').replace(/-[A-Z]+$/, '');
        
        const vehicleTypeCode = response.data.vehicle_type?.code || '';
        const bookedSpotLabel = response.data.spot_label;
        
        console.log('📱 Mobile Booking Data:', {
          plate: plateNumber,
          typeCode: vehicleTypeCode,
          bookedSpot: bookedSpotLabel,
          bookingId: response.data.booking_id
        });
        
        // Auto-fill the Vehicle Entry Form with booking data
        setPlate(plateNumber);
        setTypeCode(vehicleTypeCode);
        setSpotLabel(bookedSpotLabel);
        setBookingValidation(response.data);
        
        // Stop auto-detection since we have valid booking
        if (autoDetecting) {
          stopAutoDetection();
        }

        setSuccess(`✓ Booking Validated!\nForm auto-filled - Please review and submit manually`);

      } else {
        setError(`❌ Invalid Booking: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Booking validation error:', err);
      setError(err.response?.data?.detail || 'Failed to validate booking. Please check QR code or plate number.');
    } finally {
      setLoading(false);
    }
  };

  const validateByPlateNumber = async (plateNumber) => {
    setLoading(true);
    setError('');

    try {
      const token = sessionStorage.getItem('token');
      console.log('Searching booking by plate:', plateNumber);

      const response = await axios.get(
        `${API_URL}/mobile/bookings/search-by-plate?plate_number=${plateNumber.toUpperCase()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Plate search response:', response.data);

      // Auto-fill QR and validate
      if (response.data.qr_code_data) {
        setQrInput(response.data.qr_code_data);
        await validateMobileBooking(response.data.qr_code_data);
      }
    } catch (err) {
      console.error('Plate search error:', err);
      setError('No active mobile booking found for this vehicle. Using regular entry process.');
      // Continue with regular OCR detection
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">New Entry</h1>
              <p className="text-gray-600 mt-2">Register a new vehicle entry</p>
            </div>
            <button
              onClick={() => navigate('/controller')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              ← Back
            </button>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="text-green-600 text-4xl mr-4">✓</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Entry Created Successfully</h3>
                <div className="space-y-1 text-sm text-green-800">
                  <p><strong>Plate:</strong> {success.plate}</p>
                  <p><strong>Type:</strong> {success.type_code}</p>
                  <p><strong>Spot:</strong> {success.spot_label}</p>
                  <p><strong>Entry Time:</strong> {new Date(success.entry_time).toLocaleString()}</p>
                  <p><strong>QR Token:</strong> {success.qr_token}</p>
                  <p className="text-green-700 font-semibold mt-2">✓ Gate opened automatically - Receipt printed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Booking Scanner Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border-2 border-blue-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">📱 Mobile Booking Scanner</h2>
            <button
              onClick={() => setMobileBookingMode(!mobileBookingMode)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mobileBookingMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {mobileBookingMode ? '✓ Booking Mode Active' : 'Enable Booking Mode'}
            </button>
          </div>

          {mobileBookingMode && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800 mb-3">
                  <strong>🔍 Scan QR Code or Enter Plate Number:</strong> For vehicles with mobile bookings, scan their QR code or enter plate number to auto-validate and fill the form.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* QR Code Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scan/Enter QR Code
                    </label>
                    <input
                      type="text"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && qrInput.trim()) {
                          validateMobileBooking(qrInput.trim());
                        }
                      }}
                      placeholder="BOOKING-BK123-ABC1234-A01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (qrInput.trim()) {
                          validateMobileBooking(qrInput.trim());
                        }
                      }}
                      disabled={!qrInput.trim() || loading}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg transition"
                    >
                      {loading ? 'Validating...' : '🔍 Validate QR'}
                    </button>
                  </div>

                  {/* Plate Number Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search by Plate Number
                    </label>
                    <input
                      type="text"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && plate.trim()) {
                          validateByPlateNumber(plate.trim());
                        }
                      }}
                      placeholder="ABC-1234"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (plate.trim()) {
                          validateByPlateNumber(plate.trim());
                        }
                      }}
                      disabled={!plate.trim() || loading}
                      className="mt-2 w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2 rounded-lg transition"
                    >
                      {loading ? 'Searching...' : '🚗 Search Booking'}
                    </button>
                  </div>
                </div>

                {bookingValidation && (
                  <div className="mt-4 bg-green-50 border-2 border-green-500 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="text-green-600 text-4xl mr-4">✅</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-green-900 mb-2">Mobile Booking Validated!</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Booking ID:</strong> {bookingValidation.booking_id}</div>
                          <div><strong>Plate:</strong> {bookingValidation.plate_number}</div>
                          <div><strong>Spot:</strong> {bookingValidation.spot_label}</div>
                          <div><strong>Vehicle Type:</strong> {bookingValidation.vehicle_type?.name || 'N/A'}</div>
                        </div>
                        <p className="text-green-700 font-semibold mt-2">
                          ✓ Booking auto-checked-in | Form filled | Click "Create Entry" below
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200">
                <span className="text-sm text-gray-600">
                  💡 <strong>Tip:</strong> Scanner devices will auto-fill QR field
                </span>
                <button
                  onClick={() => {
                    setMobileBookingMode(false);
                    setQrInput('');
                    setBookingValidation(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Switch to Camera Detection
                </button>
              </div>
            </div>
          )}

          {!mobileBookingMode && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">
                📱 Enable Booking Mode to validate mobile app bookings via QR code or plate number
              </p>
            </div>
          )}
        </div>

        {/* Camera Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">📷 Camera 1 - Entry Gate Monitoring</h2>
            <div className="flex items-center space-x-2">
              {autoDetecting && (
                <span className="flex items-center text-green-600 text-sm font-semibold">
                  <span className="w-3 h-3 bg-green-600 rounded-full mr-2 animate-pulse"></span>
                  AUTO-DETECTING
                </span>
              )}
              {cameraActive && !autoDetecting && (
                <span className="flex items-center text-blue-600 text-sm font-semibold">
                  <span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
                  CAMERA READY
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Live Camera Feed - Always show when camera is active */}
            {(autoDetecting || cameraActive) && (
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
                      console.log('🔴 CAPTURE NOW BUTTON CLICKED!');
                      console.log('Current state:', { loading, cameraActive, autoDetecting });
                      captureAndDetect(true);
                    }}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center"
                  >
                    {loading ? '⏳ Processing...' : '📸 Capture Now'}
                  </button>
                </>
              ) : cameraActive ? (
                <button
                  onClick={startAutoDetection}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center"
                >
                  ▶️ Resume Auto-Detection
                </button>
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
              <strong>🤖 Automatic Detection:</strong> Camera continuously monitors for vehicles. When detected, it automatically captures image, extracts license plate, identifies vehicle type, and assigns parking spot. Review the auto-filled form and click "Create Entry" to proceed.
            </p>
          </div>
        </div>

        {/* Gate Control */}
        <GateControl
          gate="entry"
          isOpen={gateOpen}
          onOpen={handleOpenGate}
          onClose={handleCloseGate}
          loading={gateLoading}
        />

        {/* Entry Form Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Vehicle Entry Form</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="plate" className="block text-sm font-medium text-gray-700 mb-2">
                License Plate Number
              </label>
              <input
                id="plate"
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition uppercase"
                placeholder="ABC-1234"
              />
            </div>

            <div>
              <label htmlFor="typeCode" className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                id="typeCode"
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              >
                <option value="">Select vehicle type</option>
                {vehicleTypes.filter(vt => vt.is_active).map((vt) => (
                  <option key={vt.id} value={vt.code}>
                    {vt.name} ({vt.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="spotLabel" className="block text-sm font-medium text-gray-700 mb-2">
                Parking Spot
              </label>
              <select
                id="spotLabel"
                value={spotLabel}
                onChange={(e) => setSpotLabel(e.target.value)}
                required
                disabled={!typeCode}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              >
                <option value="">
                  {!typeCode ? 'Select vehicle type first' : 'Select parking spot'}
                </option>
                {availableSpots.map((spot) => (
                  <option key={spot.id} value={spot.label}>
                    {spot.label}
                  </option>
                ))}
              </select>
              {typeCode && availableSpots.length === 0 && (
                <p className="text-sm text-red-600 mt-1">No available spots for this vehicle type</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg"
            >
              {loading ? 'Creating Entry...' : 'Create Entry'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
