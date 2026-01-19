import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSpots: 0,
    activeSessions: 0,
    vehicleTypes: 0,
    todayRevenue: 0,
    cashPayments: 0,
    cardPayments: 0,
    rfidPayments: 0,
    rfidSessions: 0,
    todaySessions: 0
  });
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch parking spots
      const spotsResponse = await axios.get(
        `${API_URL}/admin/spots/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Fetch active sessions
      const sessionsResponse = await axios.get(
        `${API_URL}/controller/sessions?status=active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Fetch vehicle types
      const typesResponse = await axios.get(
        `${API_URL}/admin/fees/vehicle-types`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Fetch today's revenue
      const revenueResponse = await axios.get(
        `${API_URL}/accountant/daily?date_str=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setStats({
        totalSpots: spotsResponse.data.length,
        activeSessions: sessionsResponse.data.length,
        vehicleTypes: typesResponse.data.length,
        todayRevenue: revenueResponse.data.total_lkr || 0,
        cashPayments: revenueResponse.data.cash_lkr || 0,
        cardPayments: revenueResponse.data.card_lkr || 0,
        rfidPayments: revenueResponse.data.rfid_lkr || 0,
        rfidSessions: revenueResponse.data.rfid_sessions || 0,
        todaySessions: revenueResponse.data.sessions || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyReport = async () => {
    setReportLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.get(
        `${API_URL}/accountant/daily?date_str=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const report = `
DAILY PARKING REVENUE REPORT
Date: ${response.data.date}
========================================

Total Revenue:      LKR ${response.data.total_lkr.toFixed(2)}
Cash Payments:      LKR ${response.data.cash_lkr.toFixed(2)}
Card Payments:      LKR ${response.data.card_lkr.toFixed(2)}
RFID Sessions:      ${response.data.rfid_sessions} sessions (monthly subscription)
Total Sessions:     ${response.data.sessions}

========================================
Report Generated: ${new Date().toLocaleString()}
      `;
      
      const blob = new Blob([report], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-${today}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert('Daily report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const viewMonthlySummary = async () => {
    try {
      setReportLoading(true);
      const token = sessionStorage.getItem('token');
      
      const response = await axios.get(
        `${API_URL}/accountant/monthly?year=${selectedYear}&month=${selectedMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMonthlyData(response.data);
      setShowMonthlyModal(true);
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      alert('Failed to fetch monthly summary');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadMonthlySummary = () => {
    if (!monthlyData) return;
    
    const report = `
MONTHLY PARKING REVENUE SUMMARY
Month: ${monthlyData.month_name} ${monthlyData.year}
========================================

REVENUE SUMMARY
----------------------------------------
Total Revenue:        LKR ${monthlyData.total_revenue.toFixed(2)}
Cash Payments:        LKR ${monthlyData.cash_revenue.toFixed(2)}
Card Payments:        LKR ${monthlyData.card_revenue.toFixed(2)}
RFID Sessions:        ${monthlyData.rfid_sessions} sessions

SESSION SUMMARY
----------------------------------------
Total Sessions:       ${monthlyData.total_sessions}
Average Daily Revenue: LKR ${monthlyData.average_daily_revenue.toFixed(2)}
Average Daily Sessions: ${Math.round(monthlyData.average_daily_sessions)}

DAILY BREAKDOWN
----------------------------------------
${monthlyData.daily_data.map(day => 
  `Day ${day.day.toString().padStart(2, '0')}: LKR ${day.revenue.toFixed(2).padStart(10)} | ${day.sessions} sessions`
).join('\n')}

========================================
Report Generated: ${new Date().toLocaleString()}
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-summary-${monthlyData.year}-${monthlyData.month.toString().padStart(2, '0')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.get(
        `${API_URL}/accountant/daily?date_str=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const csvContent = `Date,Total Revenue,Cash Payments,Card Payments,RFID Sessions,Total Sessions\n${response.data.date},${response.data.total_lkr},${response.data.cash_lkr},${response.data.card_lkr},${response.data.rfid_sessions},${response.data.sessions}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parking-report-${today}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const statsArray = [
    { label: 'Total Spots', value: stats.totalSpots.toString(), icon: '🅿️', color: 'bg-blue-500' },
    { label: 'Active Sessions', value: stats.activeSessions.toString(), icon: '🚗', color: 'bg-green-500' },
    { label: 'Vehicle Types', value: stats.vehicleTypes.toString(), icon: '🚙', color: 'bg-purple-500' },
    { label: "Today's Revenue", value: `LKR ${stats.todayRevenue.toFixed(2)}`, icon: '💰', color: 'bg-yellow-500' },
    { label: 'Cash Payments', value: `LKR ${stats.cashPayments.toFixed(2)}`, icon: '💵', color: 'bg-emerald-500' },
    { label: 'Card Payments', value: `LKR ${stats.cardPayments.toFixed(2)}`, icon: '💳', color: 'bg-blue-500' },
    { label: 'RFID Sessions', value: `${stats.rfidSessions} sessions`, icon: '🎫', color: 'bg-indigo-500' },
    { label: "Today's Sessions", value: stats.todaySessions.toString(), icon: '📊', color: 'bg-rose-500' }
  ];

  const quickActions = [
    { label: 'Manage Users', path: '/admin/users', icon: '👥', color: 'bg-red-600' },
    { label: 'Manage Vehicle Types', path: '/admin/types', icon: '🚙', color: 'bg-primary-600' },
    { label: 'Manage Fees', path: '/admin/fees', icon: '💵', color: 'bg-primary-600' },
    { label: 'Manage Spots', path: '/admin/spots', icon: '🅿️', color: 'bg-primary-600' },
    { label: 'Camera Settings', path: '/admin/camera-settings', icon: '📹', color: 'bg-green-600' },
    { label: 'RFID Accounts', path: '/admin/rfid-accounts', icon: '💳', color: 'bg-purple-600' },
    { label: 'Reports & Analytics', path: '/admin/reports', icon: '📊', color: 'bg-orange-600' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage parking system, fees, spots, and users</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.path)}
                className={`${action.color} hover:opacity-90 text-white font-semibold py-4 px-6 rounded-lg transition-opacity flex items-center justify-center space-x-2`}
              >
                <span className="text-2xl">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Reports */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={generateDailyReport}
              disabled={reportLoading}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>📄</span>
              <span>{reportLoading ? 'Generating...' : 'Generate Daily Report'}</span>
            </button>
            <button 
              onClick={viewMonthlySummary}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>📊</span>
              <span>View Monthly Summary</span>
            </button>
            <button 
              onClick={exportToCSV}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>📈</span>
              <span>Export to CSV</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">System Overview</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-semibold">
                  ✓
                </div>
                <div>
                  <p className="font-medium text-gray-800">System Health</p>
                  <p className="text-sm text-gray-600">All services operational</p>
                </div>
              </div>
              <span className="text-green-600 font-semibold">Online</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  🗄️
                </div>
                <div>
                  <p className="font-medium text-gray-800">Database Status</p>
                  <p className="text-sm text-gray-600">Connection stable</p>
                </div>
              </div>
              <span className="text-blue-600 font-semibold">Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary Modal */}
      {showMonthlyModal && monthlyData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                Monthly Summary - {monthlyData.month_name} {monthlyData.year}
              </h2>
              <button
                onClick={() => setShowMonthlyModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Month/Year Selector */}
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                <button
                  onClick={viewMonthlySummary}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Load
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1">LKR {monthlyData.total_revenue.toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90">Total Sessions</p>
                  <p className="text-2xl font-bold mt-1">{monthlyData.total_sessions}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90">Avg Daily Revenue</p>
                  <p className="text-2xl font-bold mt-1">LKR {monthlyData.average_daily_revenue.toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90">RFID Sessions</p>
                  <p className="text-2xl font-bold mt-1">{monthlyData.rfid_sessions}</p>
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Revenue Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Cash Payments</p>
                    <p className="text-xl font-bold text-gray-800">LKR {monthlyData.cash_revenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{((monthlyData.cash_revenue / monthlyData.total_revenue) * 100).toFixed(1)}% of total</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Card Payments</p>
                    <p className="text-xl font-bold text-gray-800">LKR {monthlyData.card_revenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{((monthlyData.card_revenue / monthlyData.total_revenue) * 100).toFixed(1)}% of total</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Daily Sessions</p>
                    <p className="text-xl font-bold text-gray-800">{Math.round(monthlyData.average_daily_sessions)}</p>
                    <p className="text-xs text-gray-500">per day average</p>
                  </div>
                </div>
              </div>

              {/* Daily Breakdown Table */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Daily Breakdown</h3>
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Day</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Revenue (LKR)</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Sessions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {monthlyData.daily_data.map((day) => (
                        <tr key={day.day} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-800">{monthlyData.month_name} {day.day}</td>
                          <td className="px-4 py-2 text-sm text-gray-800 text-right">{day.revenue.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-gray-800 text-right">{day.sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={downloadMonthlySummary}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition"
                >
                  📄 Download Report
                </button>
                <button
                  onClick={() => setShowMonthlyModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
