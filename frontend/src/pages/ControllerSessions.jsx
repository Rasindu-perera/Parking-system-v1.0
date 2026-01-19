import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function ControllerSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState({});
  const [spots, setSpots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active'); // 'active' or 'all'

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = sessionStorage.getItem('token');
      
      // Fetch sessions, vehicle types, and spots in parallel
      const [sessionsRes, typesRes, spotsRes] = await Promise.all([
        axios.get(`${API_URL}/controller/sessions${filter === 'active' ? '?status=active' : ''}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/fees/vehicle-types`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/spots/`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Create lookup maps
      const typesMap = {};
      typesRes.data.forEach(vt => {
        typesMap[vt.id] = vt;
      });
      setVehicleTypes(typesMap);

      const spotsMap = {};
      spotsRes.data.forEach(spot => {
        spotsMap[spot.id] = spot;
      });
      setSpots(spotsMap);

      // Set sessions from backend
      setSessions(sessionsRes.data);

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleTypeName = (typeId) => {
    return vehicleTypes[typeId]?.name || 'Unknown';
  };

  const getSpotLabel = (spotId) => {
    return spots[spotId]?.label || 'Unknown';
  };

  const formatDuration = (entryTime) => {
    const entry = new Date(entryTime);
    const now = new Date();
    const diff = now - entry;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Parking Sessions</h1>
              <p className="text-gray-600 mt-2">View and manage parking sessions</p>
            </div>
            <button
              onClick={() => navigate('/controller')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Sessions List</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Active Only
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Sessions
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading sessions...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">📋</div>
              <p className="text-gray-600">No sessions found</p>
              <p className="text-sm text-gray-500 mt-2">
                Sessions will appear here once vehicles enter the parking system
              </p>
              <button
                onClick={() => navigate('/controller/entry')}
                className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition"
              >
                Create New Entry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License Plate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">#{session.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{session.vehicle?.plate_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{getVehicleTypeName(session.vehicle?.type_id)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getSpotLabel(session.spot_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.entry_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.status === 'active' ? formatDuration(session.entry_time) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          session.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {session.status === 'active' && (
                          <button
                            onClick={() => navigate('/controller/exit', { state: { sessionId: session.id } })}
                            className="text-primary-600 hover:text-primary-900 font-medium"
                          >
                            Process Exit →
                          </button>
                        )}
                        {session.status === 'closed' && session.qr_token && (
                          <a
                            href={`${API_URL}/receipts/${session.qr_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-900 font-medium"
                          >
                            View Receipt
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
