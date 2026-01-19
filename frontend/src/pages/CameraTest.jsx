import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8002';

export default function CameraTest() {
  const [status, setStatus] = useState('Ready to test');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      setStatus('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setStatus('Camera started! Click "Capture & Test OCR"');
      }
    } catch (err) {
      setError('Camera error: ' + err.message);
      setStatus('Camera failed');
    }
  };

  const captureAndTest = async () => {
    try {
      setStatus('Capturing image...');
      setError('');
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        setStatus('Sending to backend...');
        
        const token = sessionStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const response = await axios.post(
            `${API_URL}/camera/camera1/capture`,
            formData,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
          
          setResult(response.data);
          setStatus('✓ Detection complete!');
        } catch (err) {
          setError('Backend error: ' + (err.response?.data?.detail || err.message));
          setStatus('❌ Detection failed');
        }
      }, 'image/jpeg', 0.95);
      
    } catch (err) {
      setError('Capture error: ' + err.message);
      setStatus('❌ Capture failed');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStatus('Camera stopped');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">🔍 Camera Detection Test</h1>
        
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <p className="font-semibold">Status: {status}</p>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-800 rounded">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        <div className="mb-4 space-x-4">
          <button 
            onClick={startCamera}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Start Camera
          </button>
          <button 
            onClick={captureAndTest}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Capture & Test OCR
          </button>
          <button 
            onClick={stopCamera}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
          >
            Stop Camera
          </button>
        </div>
        
        <div className="mb-4">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            className="w-full max-w-2xl border-4 border-gray-300 rounded"
          />
        </div>
        
        {result && (
          <div className="p-4 bg-green-50 rounded">
            <h2 className="text-xl font-bold mb-2">Detection Result:</h2>
            <pre className="bg-white p-4 rounded border overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
