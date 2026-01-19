import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function AdminCameraSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    camera1_device: '0',
    camera2_device: '1'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableDevices, setAvailableDevices] = useState([]);
  const [camera1Type, setCamera1Type] = useState('device');
  const [camera2Type, setCamera2Type] = useState('device');
  const [camera1IP, setCamera1IP] = useState('');
  const [camera2IP, setCamera2IP] = useState('');

  useEffect(() => {
    fetchSettings();
    enumerateDevices();
  }, []);

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableDevices(videoDevices);
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      setError('Failed to detect cameras. Please check browser permissions.');
    }
  };

  const fetchSettings = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/camera/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
      
      // Detect if settings contain IP addresses
      if (response.data.camera1_device && response.data.camera1_device.startsWith('http')) {
        setCamera1Type('ip');
        setCamera1IP(response.data.camera1_device);
      }
      if (response.data.camera2_device && response.data.camera2_device.startsWith('http')) {
        setCamera2Type('ip');
        setCamera2IP(response.data.camera2_device);
      }
    } catch (err) {
      console.error('Error fetching camera settings:', err);
      setError('Failed to load camera settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare settings based on selected type
      const finalSettings = {
        camera1_device: camera1Type === 'ip' ? camera1IP : settings.camera1_device,
        camera2_device: camera2Type === 'ip' ? camera2IP : settings.camera2_device
      };

      const token = sessionStorage.getItem('token');
      await axios.post(
        `${API_URL}/camera/settings`,
        finalSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Camera settings updated successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.detail || 'Failed to save camera settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Camera Settings</h1>
              <p className="text-gray-600 mt-2">Configure camera devices for entry and exit gates</p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              ← Back
            </button>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-center text-gray-600">Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Camera 1 - Entry Gate */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="text-4xl mr-4">📹</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Camera 1 - Entry Gate</h2>
                  <p className="text-sm text-gray-600">Connected to Gate 1 (Entry)</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Camera Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Camera Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="device"
                        checked={camera1Type === 'device'}
                        onChange={(e) => setCamera1Type(e.target.value)}
                        className="mr-2"
                      />
                      <span>Local Device</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="ip"
                        checked={camera1Type === 'ip'}
                        onChange={(e) => setCamera1Type(e.target.value)}
                        className="mr-2"
                      />
                      <span>IP Camera</span>
                    </label>
                  </div>
                </div>

                {camera1Type === 'device' ? (
                  <div>
                    <label htmlFor="camera1_device" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Camera Device
                    </label>
                    <select
                      id="camera1_device"
                      value={settings.camera1_device}
                      onChange={(e) => setSettings({ ...settings, camera1_device: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {availableDevices.length > 0 ? (
                        availableDevices.map((device, index) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${index}`} {index === 0 ? '(Default)' : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="0">Camera 0 (Default)</option>
                          <option value="1">Camera 1</option>
                          <option value="2">Camera 2</option>
                          <option value="3">Camera 3</option>
                        </>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      {availableDevices.length > 0 
                        ? `${availableDevices.length} camera(s) detected. Select the camera for entry gate.`
                        : 'No cameras detected. Allow camera permissions or use manual device IDs.'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="camera1_ip" className="block text-sm font-medium text-gray-700 mb-2">
                      IP Camera URL
                    </label>
                    <input
                      id="camera1_ip"
                      type="text"
                      value={camera1IP}
                      onChange={(e) => setCamera1IP(e.target.value)}
                      placeholder="http://192.168.1.100:8080/video"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter the full URL for your IP camera stream (e.g., http://192.168.1.100:8080/video)
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Camera 1 Function:</strong> Continuously monitors entry area. When vehicle detected, 
                    automatically captures image, extracts license plate, identifies vehicle type, assigns parking spot, 
                    and opens Gate 1.
                  </p>
                </div>
              </div>
            </div>

            {/* Camera 2 - Exit Gate */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="text-4xl mr-4">📹</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Camera 2 - Exit Gate</h2>
                  <p className="text-sm text-gray-600">Connected to Gate 2 (Exit)</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Camera Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Camera Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="device"
                        checked={camera2Type === 'device'}
                        onChange={(e) => setCamera2Type(e.target.value)}
                        className="mr-2"
                      />
                      <span>Local Device</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="ip"
                        checked={camera2Type === 'ip'}
                        onChange={(e) => setCamera2Type(e.target.value)}
                        className="mr-2"
                      />
                      <span>IP Camera</span>
                    </label>
                  </div>
                </div>

                {camera2Type === 'device' ? (
                  <div>
                    <label htmlFor="camera2_device" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Camera Device
                    </label>
                    <select
                      id="camera2_device"
                      value={settings.camera2_device}
                      onChange={(e) => setSettings({ ...settings, camera2_device: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {availableDevices.length > 0 ? (
                        availableDevices.map((device, index) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${index}`}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="0">Camera 0 (Default)</option>
                          <option value="1">Camera 1</option>
                          <option value="2">Camera 2</option>
                          <option value="3">Camera 3</option>
                        </>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      {availableDevices.length > 0 
                        ? `${availableDevices.length} camera(s) detected. Select a different camera from Camera 1.`
                        : 'No cameras detected. Allow camera permissions or use manual device IDs.'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="camera2_ip" className="block text-sm font-medium text-gray-700 mb-2">
                      IP Camera URL
                    </label>
                    <input
                      id="camera2_ip"
                      type="text"
                      value={camera2IP}
                      onChange={(e) => setCamera2IP(e.target.value)}
                      placeholder="http://192.168.1.101:8080/video"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter the full URL for your IP camera stream. Use a different IP than Camera 1.
                    </p>
                  </div>
                )}

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-800">
                    <strong>Camera 2 Function:</strong> Continuously monitors exit area. When vehicle detected, 
                    automatically captures image, extracts license plate, searches active session, calculates fee, 
                    and opens Gate 2 after payment.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold py-3 rounded-lg transition"
              >
                {saving ? 'Saving Settings...' : 'Save Camera Settings'}
              </button>
            </div>

            {/* Detected Cameras Info */}
            {availableDevices.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-green-900 mb-3">✓ Detected Cameras ({availableDevices.length})</h3>
                <div className="space-y-2">
                  {availableDevices.map((device, index) => (
                    <div key={device.deviceId} className="flex items-center p-2 bg-white rounded border border-green-200">
                      <span className="text-green-600 font-bold mr-3">{index}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{device.label || `Camera ${index}`}</p>
                        <p className="text-xs text-gray-500">Device ID: {device.deviceId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">ℹ️ Important Notes</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
                <li>Cameras run continuously in Controller Entry/Exit pages</li>
                <li>Vehicle detection and image capture are automatic</li>
                <li>License plate recognition happens in real-time</li>
                <li>Gates open automatically after successful processing</li>
                <li>Ensure cameras have clear view of license plates</li>
                <li>Good lighting improves OCR accuracy</li>
                <li><strong>Local Devices:</strong> Select from detected cameras on this computer</li>
                <li><strong>IP Cameras:</strong> Enter stream URL (e.g., http://192.168.1.100:8080/video)</li>
                <li>For IP cameras, ensure they support MJPEG or compatible browser streaming</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
