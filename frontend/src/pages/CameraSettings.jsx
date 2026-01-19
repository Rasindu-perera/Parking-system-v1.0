import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function CameraSettings() {
  const [cameras, setCameras] = useState([
    {
      id: 1,
      gate: 'Gate 1',
      location: 'Entry Side',
      ipAddress: '',
      port: '8080',
      username: '',
      password: '',
      status: 'disconnected',
      type: 'entry'
    },
    {
      id: 2,
      gate: 'Gate 2',
      location: 'Exit Side',
      ipAddress: '',
      port: '8080',
      username: '',
      password: '',
      status: 'disconnected',
      type: 'exit'
    }
  ]);

  const [editingCamera, setEditingCamera] = useState(null);
  const [showPassword, setShowPassword] = useState({});

  useEffect(() => {
    loadCameraSettings();
  }, []);

  const loadCameraSettings = () => {
    // Load camera settings from sessionStorage
    const savedSettings = sessionStorage.getItem('cameraSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setCameras(parsed);
      } catch (error) {
        console.error('Error loading camera settings:', error);
      }
    }
  };

  const saveCameraSettings = (updatedCameras) => {
    sessionStorage.setItem('cameraSettings', JSON.stringify(updatedCameras));
    setCameras(updatedCameras);
  };

  const handleEdit = (camera) => {
    setEditingCamera({ ...camera });
  };

  const handleSave = () => {
    if (!editingCamera) return;

    const updatedCameras = cameras.map(cam => 
      cam.id === editingCamera.id ? editingCamera : cam
    );
    saveCameraSettings(updatedCameras);
    setEditingCamera(null);
    alert('Camera settings saved successfully!');
  };

  const handleCancel = () => {
    setEditingCamera(null);
  };

  const handleTestConnection = async (camera) => {
    // Simulate connection test
    const updatedCameras = cameras.map(cam => {
      if (cam.id === camera.id) {
        // Check if all required fields are filled
        if (!cam.ipAddress || !cam.port) {
          alert('Please configure IP Address and Port first!');
          return { ...cam, status: 'disconnected' };
        }
        
        // Simulate connection test
        const isConnected = cam.ipAddress && cam.port;
        return { ...cam, status: isConnected ? 'connected' : 'disconnected' };
      }
      return cam;
    });
    
    saveCameraSettings(updatedCameras);
    
    const testCamera = updatedCameras.find(c => c.id === camera.id);
    if (testCamera.status === 'connected') {
      alert(`✅ ${camera.gate} camera connected successfully!`);
    } else {
      alert(`❌ Failed to connect to ${camera.gate} camera.`);
    }
  };

  const handleDisconnect = (camera) => {
    const updatedCameras = cameras.map(cam => 
      cam.id === camera.id ? { ...cam, status: 'disconnected' } : cam
    );
    saveCameraSettings(updatedCameras);
    alert(`${camera.gate} camera disconnected.`);
  };

  const togglePasswordVisibility = (cameraId) => {
    setShowPassword(prev => ({
      ...prev,
      [cameraId]: !prev[cameraId]
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800">Camera Settings</h1>
          <p className="text-gray-600 mt-2">Configure cameras for Gate 1 (Entry) and Gate 2 (Exit)</p>
        </div>

        {/* Camera Configuration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cameras.map((camera) => (
            <div key={camera.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Camera Header */}
              <div className={`p-4 ${camera.type === 'entry' ? 'bg-green-600' : 'bg-blue-600'} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">📹</span>
                    <div>
                      <h2 className="text-xl font-bold">{camera.gate}</h2>
                      <p className="text-sm opacity-90">{camera.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${camera.status === 'connected' ? 'bg-green-300' : 'bg-red-300'}`}></div>
                    <span className="text-sm font-semibold capitalize">{camera.status}</span>
                  </div>
                </div>
              </div>

              {/* Camera Details */}
              <div className="p-6 space-y-4">
                {editingCamera?.id === camera.id ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IP Address *
                      </label>
                      <input
                        type="text"
                        value={editingCamera.ipAddress}
                        onChange={(e) => setEditingCamera({ ...editingCamera, ipAddress: e.target.value })}
                        placeholder="192.168.1.100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Port *
                      </label>
                      <input
                        type="text"
                        value={editingCamera.port}
                        onChange={(e) => setEditingCamera({ ...editingCamera, port: e.target.value })}
                        placeholder="8080"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingCamera.username}
                        onChange={(e) => setEditingCamera({ ...editingCamera, username: e.target.value })}
                        placeholder="admin"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password (Optional)
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword[camera.id] ? 'text' : 'password'}
                          value={editingCamera.password}
                          onChange={(e) => setEditingCamera({ ...editingCamera, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(camera.id)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword[camera.id] ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={handleSave}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        ✖️ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">IP Address</p>
                        <p className="text-gray-800 font-semibold">{camera.ipAddress || 'Not configured'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Port</p>
                        <p className="text-gray-800 font-semibold">{camera.port || 'Not configured'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Username</p>
                        <p className="text-gray-800 font-semibold">{camera.username || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Authentication</p>
                        <p className="text-gray-800 font-semibold">{camera.password ? '✓ Configured' : 'None'}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <button
                        onClick={() => handleEdit(camera)}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>⚙️</span>
                        <span>Configure Settings</span>
                      </button>

                      {camera.status === 'disconnected' ? (
                        <button
                          onClick={() => handleTestConnection(camera)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                        >
                          <span>🔌</span>
                          <span>Connect Camera</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDisconnect(camera)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                        >
                          <span>⚠️</span>
                          <span>Disconnect Camera</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Camera System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl">
                  📹
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gate 1 - Entry</p>
                  <p className="text-lg font-bold text-gray-800">
                    {cameras.find(c => c.id === 1)?.status === 'connected' ? '✅ Active' : '⚠️ Inactive'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl">
                  📹
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gate 2 - Exit</p>
                  <p className="text-lg font-bold text-gray-800">
                    {cameras.find(c => c.id === 2)?.status === 'connected' ? '✅ Active' : '⚠️ Inactive'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl">
                  🔒
                </div>
                <div>
                  <p className="text-sm text-gray-600">System Status</p>
                  <p className="text-lg font-bold text-gray-800">
                    {cameras.every(c => c.status === 'connected') ? '🟢 All Online' : '🟡 Partial'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Setup Instructions</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li><strong>Gate 1 (Entry Side):</strong> Camera for vehicle entry and license plate recognition</li>
              <li><strong>Gate 2 (Exit Side):</strong> Camera for vehicle exit and validation</li>
              <li>Configure IP address and port for each camera to establish connection</li>
              <li>Optional: Add username/password for cameras with authentication</li>
              <li>Click "Connect Camera" to test and activate the connection</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
