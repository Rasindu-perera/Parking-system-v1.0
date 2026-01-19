import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function RFIDRegistrarDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    totalVehicles: 0,
    expiringThisMonth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/rfid/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const accounts = response.data;
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const totalVehicles = accounts.reduce((sum, acc) => sum + acc.vehicles.length, 0);
      const expiringThisMonth = accounts.filter(acc => {
        const validTo = new Date(acc.valid_to);
        return validTo.getMonth() === now.getMonth() && validTo.getFullYear() === now.getFullYear();
      }).length;
      
      setStats({
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter(a => a.status).length,
        totalVehicles,
        expiringThisMonth
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsArray = [
    { label: 'Total Accounts', value: stats.totalAccounts.toString(), icon: '👥', color: 'bg-blue-500' },
    { label: 'Active Accounts', value: stats.activeAccounts.toString(), icon: '✅', color: 'bg-green-500' },
    { label: 'Total Vehicles', value: stats.totalVehicles.toString(), icon: '🚗', color: 'bg-purple-500' },
    { label: 'Expiring This Month', value: stats.expiringThisMonth.toString(), icon: '⏰', color: 'bg-orange-500' }
  ];

  const quickActions = [
    { label: 'Manage RFID Accounts', path: '/rfid-registrar/accounts', icon: '📋', color: 'bg-primary-600', state: null },
    { label: 'Create New Account', path: '/rfid-registrar/accounts', icon: '➕', color: 'bg-green-600', state: { openForm: true } }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800">RFID Registrar Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage RFID accounts and vehicle registrations</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.path, { state: action.state })}
                className={`${action.color} hover:opacity-90 text-white font-semibold py-4 px-6 rounded-lg transition-opacity flex items-center justify-center space-x-2`}
              >
                <span className="text-2xl">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Role Information</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  👤
                </div>
                <div>
                  <p className="font-medium text-gray-800">RFID Registrar Role</p>
                  <p className="text-sm text-gray-600">Manage RFID accounts and vehicle registrations</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-semibold">
                  ✓
                </div>
                <div>
                  <p className="font-medium text-gray-800">Permissions</p>
                  <p className="text-sm text-gray-600">Create, view, and manage RFID accounts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
