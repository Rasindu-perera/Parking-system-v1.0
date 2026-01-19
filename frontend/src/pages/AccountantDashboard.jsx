import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    cashPayments: 0,
    cardPayments: 0,
    rfidPayments: 0,
    rfidSessions: 0,
    totalSessions: 0
  });
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Fetch today's report
      const reportResponse = await axios.get(
        `${API_URL}/accountant/daily?date_str=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = reportResponse.data;
      
      setStats({
        todayRevenue: data.total_lkr || 0,
        cashPayments: data.cash_lkr || 0,
        cardPayments: data.card_lkr || 0,
        rfidPayments: data.rfid_lkr || 0,
        rfidSessions: data.rfid_sessions || 0,
        totalSessions: data.sessions || 0
      });
      
      // Fetch recent payments (we'll create a simple query)
      // For now, we can fetch recent closed sessions with payments
      const sessionsResponse = await axios.get(
        `${API_URL}/controller/sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Filter closed sessions and map to payments
      const recentPayments = sessionsResponse.data
        .filter(session => session.status === 'closed' && session.payment_method)
        .slice(0, 10)
        .map(session => ({
          id: session.id,
          plate: session.plate,
          amount: session.calculated_fee_lkr || 0,
          method: session.payment_method,
          time: session.exit_time ? new Date(session.exit_time).toLocaleString() : 'N/A'
        }));
      
      setPayments(recentPayments);
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
      
      // Create a formatted report
      const report = `
DAILY PARKING REVENUE REPORT
Date: ${response.data.date}
========================================

Total Revenue:      LKR ${response.data.total_lkr.toFixed(2)}
Cash Payments:      LKR ${response.data.cash_lkr.toFixed(2)}
Card Payments:      LKR ${response.data.card_lkr.toFixed(2)}
RFID Sessions:      ${response.data.rfid_sessions} sessions (monthly subscription)
Total Sessions:     ${response.data.sessions}

Note: RFID users pay monthly fees, not per-session charges.

Generated on: ${new Date().toLocaleString()}
      `.trim();
      
      // Download as text file
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

  const viewMonthlySummary = () => {
    alert('Monthly summary feature coming soon!');
  };

  const exportToCSV = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.get(
        `${API_URL}/accountant/daily?date_str=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Create CSV content
      const csvContent = `Date,Total Revenue (LKR),Cash (LKR),Card (LKR),RFID Sessions,Total Sessions\n${response.data.date},${response.data.total_lkr},${response.data.cash_lkr},${response.data.card_lkr},${response.data.rfid_sessions},${response.data.sessions}`;
      
      // Download as CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-${today}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const statsArray = [
    { label: "Today's Revenue", value: `LKR ${stats.todayRevenue.toFixed(2)}`, icon: '💰', color: 'bg-green-500' },
    { label: 'Cash Payments', value: `LKR ${stats.cashPayments.toFixed(2)}`, icon: '💵', color: 'bg-blue-500' },
    { label: 'Card Payments', value: `LKR ${stats.cardPayments.toFixed(2)}`, icon: '💳', color: 'bg-cyan-500' },
    { label: 'RFID Sessions', value: `${stats.rfidSessions} sessions`, icon: '🎫', color: 'bg-purple-500' },
    { label: 'Total Sessions', value: stats.totalSessions.toString(), icon: '📊', color: 'bg-orange-500' }
  ];

  // Calculate percentages for payment methods (cash and card only, RFID is monthly subscription)
  const totalRevenue = stats.cashPayments + stats.cardPayments;
  const cashPercentage = totalRevenue > 0 ? ((stats.cashPayments / totalRevenue) * 100).toFixed(0) : 0;
  const cardPercentage = totalRevenue > 0 ? ((stats.cardPayments / totalRevenue) * 100).toFixed(0) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800">Accountant Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor revenue, payments, and financial reports</p>
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

        {/* Payment Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Method Distribution</h2>
            {loading ? (
              <p className="text-center text-gray-600 py-8">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium">Cash</span>
                    <span className="text-gray-900 font-bold">{cashPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${cashPercentage}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium">Card</span>
                    <span className="text-gray-900 font-bold">{cardPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-cyan-500 h-3 rounded-full" style={{ width: `${cardPercentage}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium">RFID Sessions</span>
                    <span className="text-gray-900 font-bold">{stats.rfidSessions} sessions</span>
                  </div>
                  <div className="text-sm text-gray-600 italic">
                    Monthly subscription (not per-session revenue)
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Reports</h2>
            <div className="space-y-3">
              <button 
                onClick={generateDailyReport}
                disabled={reportLoading}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>📄</span>
                <span>{reportLoading ? 'Generating...' : 'Generate Daily Report'}</span>
              </button>
              <button 
                onClick={viewMonthlySummary}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>📊</span>
                <span>View Monthly Summary</span>
              </button>
              <button 
                onClick={exportToCSV}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>📈</span>
                <span>Export to CSV</span>
              </button>
              <button 
                onClick={() => navigate('/accountant/reports')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>📊</span>
                <span>Advanced Reports & Analytics</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Payments</h2>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-center text-gray-600 py-8">Loading payments...</p>
            ) : payments.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No payments found</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License Plate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payment.plate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">LKR {payment.amount.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.method === 'cash' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {payment.method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.time}
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
