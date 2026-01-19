import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function ControllerDashboard() {
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({
    activeSessions: 0,
    availableSpots: 0,
    todayEntries: 0,
    todayExits: 0,
    todayRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        navigate('/login');
        return;
      }
      
      console.log('Fetching dashboard data...');
      
      // Fetch active sessions
      const activeSessionsResponse = await axios.get(
        `${API_URL}/controller/sessions?status=active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Active sessions response:', activeSessionsResponse.data);
      
      // Fetch ALL sessions (no status filter) to count entries from last 24 hours
      const allSessionsResponse = await axios.get(
        `${API_URL}/controller/sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('All sessions response:', allSessionsResponse.data);
      
      // Fetch all parking spots
      const spotsResponse = await axios.get(
        `${API_URL}/admin/spots/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Spots response:', spotsResponse.data);
      
      // Calculate stats
      const activeSessions = activeSessionsResponse.data.length;
      const availableSpots = spotsResponse.data.filter(spot => !spot.is_occupied).length;
      
      // Count entries from last 24 hours (not just today)
      const now = new Date();
      const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      const todayEntries = allSessionsResponse.data.filter(session => {
        if (session.entry_time) {
          const entryDate = new Date(session.entry_time);
          return entryDate >= last24Hours;
        }
        return false;
      }).length;
      
      console.log('Last 24h entries count:', todayEntries);
      
      // Count exits from last 24 hours
      const todayExits = allSessionsResponse.data.filter(session => {
        if (session.exit_time) {
          const exitDate = new Date(session.exit_time);
          return exitDate >= last24Hours && session.status === 'closed';
        }
        return false;
      }).length;
      
      console.log('Last 24h exits count:', todayExits);
      
      // Fetch today's revenue
      const today = new Date().toISOString().split('T')[0];
      const revenueResponse = await axios.get(
        `${API_URL}/accountant/daily?date_str=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const todayRevenue = revenueResponse.data.total_lkr || 0;
      console.log('Today\'s revenue:', todayRevenue);
      
      // Get recent active sessions (last 5)
      const recentSessionsData = activeSessionsResponse.data.slice(0, 5).map(session => {
        console.log('Processing session:', session);
        return {
          id: session.id,
          plate: session.vehicle?.plate_number || 'N/A',
          type: session.vehicle?.type_id || 'N/A',
          spot: session.spot_label || 'N/A',
          entry: new Date(session.entry_time).toLocaleString(),
          status: session.status
        };
      });
      
      console.log('Recent sessions data:', recentSessionsData);
      
      setStats({
        activeSessions,
        availableSpots,
        todayEntries: todayEntries,
        todayExits: todayExits,
        todayRevenue: todayRevenue
      });
      
      setRecentSessions(recentSessionsData);
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data);
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Authentication error - redirecting to login');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const statsArray = [
    { label: 'Available Spots', value: stats.availableSpots.toString(), icon: '🅿️', color: 'bg-blue-500' },
    { label: "Last 24h Entries", value: stats.todayEntries.toString(), icon: '📥', color: 'bg-purple-500' },
    { label: "Last 24h Exits", value: stats.todayExits.toString(), icon: '📤', color: 'bg-orange-500' },
    { label: "Today's Revenue", value: `LKR ${stats.todayRevenue.toFixed(2)}`, icon: '💰', color: 'bg-yellow-500' }
  ];

  const quickActions = [
    { label: 'New Entry', path: '/controller/entry', icon: '➕', color: 'bg-green-600', newTab: true },
    { label: 'Process Exit', path: '/controller/exit', icon: '🚪', color: 'bg-red-600', newTab: true },
    { label: 'View Sessions', path: '/controller/sessions', icon: '📋', color: 'bg-primary-600', newTab: false }
  ];

  const handleActionClick = (action) => {
    if (action.newTab) {
      window.open(action.path, '_blank');
    } else {
      navigate(action.path);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800">Controller Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage vehicle entry, exit, and parking sessions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-4 text-center py-8">
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          ) : (
            statsArray.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} text-white text-3xl p-4 rounded-lg`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleActionClick(action)}
                className={`${action.color} hover:opacity-90 text-white font-semibold py-4 px-6 rounded-lg transition-opacity flex items-center justify-center space-x-2`}
              >
                <span className="text-2xl">{action.icon}</span>
                <span>{action.label}</span>
                {action.newTab && <span className="text-sm">🗗</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Active Sessions</h2>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-center text-gray-600 py-8">Loading sessions...</p>
            ) : recentSessions.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No active sessions found</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{session.plate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{session.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {session.spot}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.entry}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
