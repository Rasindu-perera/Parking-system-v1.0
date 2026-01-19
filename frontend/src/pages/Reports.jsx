import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { jsPDF } from 'jspdf';

const API_URL = 'http://127.0.0.1:8002';

export default function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('revenue'); // revenue, vehicle, operational, financial
  const [dateRange, setDateRange] = useState('daily'); // daily, weekly, monthly
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    // Set default date range based on selection
    const today = new Date();
    if (dateRange === 'weekly') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (dateRange === 'monthly') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      setStartDate(monthAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else {
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  }, [dateRange]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      
      if (reportType === 'revenue') {
        const response = await axios.get(
          `${API_URL}/accountant/daily?date_str=${startDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReportData(response.data);
      } else if (reportType === 'operational' || reportType === 'vehicle') {
        // Fetch sessions and vehicle types
        const [sessionsResponse, typesResponse] = await Promise.all([
          axios.get(`${API_URL}/controller/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/admin/fees/vehicle-types`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        // Create vehicle type map (id -> name)
        const typeMap = {};
        typesResponse.data.forEach(type => {
          typeMap[type.id] = type.name;
        });
        
        // Filter sessions by date range
        const filtered = sessionsResponse.data.filter(session => {
          const entryDate = new Date(session.entry_time);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59);
          return entryDate >= start && entryDate <= end;
        });
        
        setSessions(filtered);
        
        // Calculate statistics
        const totalSessions = filtered.length;
        const activeSessions = filtered.filter(s => s.status === 'active').length;
        const completedSessions = filtered.filter(s => s.status === 'closed').length;
        
        // Vehicle type breakdown with names
        const vehicleTypes = {};
        filtered.forEach(session => {
          const typeId = session.vehicle?.type_id;
          const typeName = typeMap[typeId] || 'Unknown';
          vehicleTypes[typeName] = (vehicleTypes[typeName] || 0) + 1;
        });
        
        setReportData({
          totalSessions,
          activeSessions,
          completedSessions,
          vehicleTypes,
          sessions: filtered
        });
      } else if (reportType === 'financial') {
        const response = await axios.get(
          `${API_URL}/accountant/daily?date_str=${startDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;
    
    // Helper function to add text with auto-wrap
    const addText = (text, x, y, maxWidth = pageWidth - 40, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.35);
    };
    
    // Helper to check if we need a new page
    const checkPageBreak = (requiredSpace = 20) => {
      if (yPos + requiredSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
    };
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    
    if (reportType === 'revenue') {
      doc.text('REVENUE SUMMARY REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos = addText(`Report Type: ${dateRange.toUpperCase()}`, 20, yPos);
      yPos = addText(`Date Range: ${startDate} to ${endDate}`, 20, yPos);
      yPos = addText(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      yPos = addText('FINANCIAL SUMMARY', 20, yPos);
      yPos += 5;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      yPos = addText(`Total Revenue:      LKR ${reportData?.total_lkr?.toFixed(2) || '0.00'}`, 20, yPos);
      yPos = addText(`Cash Payments:      LKR ${reportData?.cash_lkr?.toFixed(2) || '0.00'}`, 20, yPos);
      yPos = addText(`Card Payments:      LKR ${reportData?.card_lkr?.toFixed(2) || '0.00'}`, 20, yPos);
      yPos = addText(`RFID Sessions:      ${reportData?.rfid_sessions || 0} sessions (monthly subscription)`, 20, yPos);
      yPos = addText(`Total Sessions:     ${reportData?.sessions || 0}`, 20, yPos);
      
    } else if (reportType === 'vehicle') {
      doc.text('VEHICLE USAGE REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos = addText(`Report Type: ${dateRange.toUpperCase()}`, 20, yPos);
      yPos = addText(`Date Range: ${startDate} to ${endDate}`, 20, yPos);
      yPos = addText(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      yPos = addText('VEHICLE STATISTICS', 20, yPos);
      yPos += 5;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      yPos = addText(`Total Sessions:     ${reportData?.totalSessions || 0}`, 20, yPos);
      yPos = addText(`Active Sessions:    ${reportData?.activeSessions || 0}`, 20, yPos);
      yPos = addText(`Completed Sessions: ${reportData?.completedSessions || 0}`, 20, yPos);
      yPos += 5;
      
      yPos = addText('Vehicle Type Breakdown:', 20, yPos);
      Object.entries(reportData?.vehicleTypes || {}).forEach(([type, count]) => {
        yPos = addText(`  Type ${type}: ${count} vehicles`, 20, yPos);
      });
      
    } else if (reportType === 'operational') {
      doc.text('OPERATIONAL TRANSACTION LOG', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos = addText(`Report Type: ${dateRange.toUpperCase()}`, 20, yPos);
      yPos = addText(`Date Range: ${startDate} to ${endDate}`, 20, yPos);
      yPos = addText(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      yPos = addText('TRANSACTION SUMMARY', 20, yPos);
      yPos += 5;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      yPos = addText(`Total Transactions: ${reportData?.totalSessions || 0}`, 20, yPos);
      yPos = addText(`Active Sessions:    ${reportData?.activeSessions || 0}`, 20, yPos);
      yPos = addText(`Completed Sessions: ${reportData?.completedSessions || 0}`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      yPos = addText('TRANSACTION DETAILS', 20, yPos);
      yPos += 5;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      reportData?.sessions?.slice(0, 30).forEach(session => {
        checkPageBreak(30);
        yPos = addText(`Plate: ${session.vehicle?.plate_number || 'N/A'}`, 20, yPos);
        yPos = addText(`Entry: ${new Date(session.entry_time).toLocaleString()}`, 20, yPos);
        yPos = addText(`Exit: ${session.exit_time ? new Date(session.exit_time).toLocaleString() : 'Active'}`, 20, yPos);
        yPos = addText(`Status: ${session.status} | Fee: ${session.calculated_fee_lkr ? `LKR ${session.calculated_fee_lkr}` : 'N/A'}`, 20, yPos);
        yPos += 3;
      });
      
    } else if (reportType === 'financial') {
      doc.text('FINANCIAL ANALYSIS REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos = addText(`Report Type: ${dateRange.toUpperCase()}`, 20, yPos);
      yPos = addText(`Date Range: ${startDate} to ${endDate}`, 20, yPos);
      yPos = addText(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      yPos = addText('REVENUE BREAKDOWN', 20, yPos);
      yPos += 5;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      yPos = addText(`Total Revenue:      LKR ${reportData?.total_lkr?.toFixed(2) || '0.00'}`, 20, yPos);
      yPos = addText(`Cash Payments:      LKR ${reportData?.cash_lkr?.toFixed(2) || '0.00'}`, 20, yPos);
      yPos = addText(`Card Payments:      LKR ${reportData?.card_lkr?.toFixed(2) || '0.00'}`, 20, yPos);
      yPos = addText(`RFID Sessions:      ${reportData?.rfid_sessions || 0} sessions`, 20, yPos);
      yPos += 5;
      
      yPos = addText('Payment Method Distribution:', 20, yPos);
      const cashPercent = reportData?.cash_lkr && reportData?.total_lkr ? 
        ((reportData.cash_lkr / reportData.total_lkr) * 100).toFixed(1) : 0;
      const cardPercent = reportData?.card_lkr && reportData?.total_lkr ? 
        ((reportData.card_lkr / reportData.total_lkr) * 100).toFixed(1) : 0;
      yPos = addText(`  Cash: ${cashPercent}%`, 20, yPos);
      yPos = addText(`  Card: ${cardPercent}%`, 20, yPos);
      yPos += 5;
      
      doc.setFontSize(9);
      yPos = addText('Note: RFID users pay monthly subscription, not per-session fees.', 20, yPos);
      yPos += 5;
      
      doc.setFontSize(11);
      yPos = addText(`Total Sessions:     ${reportData?.sessions || 0}`, 20, yPos);
      const avgPerSession = reportData?.total_lkr && reportData?.sessions ? 
        (reportData.total_lkr / reportData.sessions).toFixed(2) : '0.00';
      yPos = addText(`Average per Session: LKR ${avgPerSession}`, 20, yPos);
    }
    
    // Save PDF
    doc.save(`${reportType}-report-${startDate}-${endDate}.pdf`);
    alert('PDF downloaded successfully!');
  };

  const downloadCSV = () => {
    let csvContent = '';
    
    if (reportType === 'revenue' || reportType === 'financial') {
      csvContent = `Date,Total Revenue,Cash,Card,RFID Sessions,Total Sessions\n${startDate},${reportData?.total_lkr || 0},${reportData?.cash_lkr || 0},${reportData?.card_lkr || 0},${reportData?.rfid_sessions || 0},${reportData?.sessions || 0}`;
    } else if (reportType === 'operational' || reportType === 'vehicle') {
      csvContent = 'Plate,Entry Time,Exit Time,Status,Fee,Payment Method\n';
      reportData?.sessions?.forEach(session => {
        csvContent += `${session.vehicle?.plate_number || 'N/A'},${new Date(session.entry_time).toLocaleString()},${session.exit_time ? new Date(session.exit_time).toLocaleString() : 'Active'},${session.status},${session.calculated_fee_lkr || 0},${session.payment_method || 'N/A'}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${startDate}-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('CSV exported successfully!');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
              <p className="text-gray-600 mt-2">Generate comprehensive reports with charts and downloadable formats</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Report Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="revenue">Revenue Summary</option>
                <option value="vehicle">Vehicle & User Report</option>
                <option value="operational">Operational Transaction Log</option>
                <option value="financial">Financial Analysis</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={generateReport}
              disabled={loading}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              {loading ? '⏳ Generating...' : '📊 Generate Report'}
            </button>
            
            {reportData && (
              <>
                <button
                  onClick={downloadPDF}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  📄 Download PDF
                </button>
                <button
                  onClick={downloadCSV}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  📈 Export CSV
                </button>
              </>
            )}
          </div>
        </div>

        {/* Report Results */}
        {reportData && (
          <>
            {/* Revenue Report */}
            {reportType === 'revenue' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-900 mt-2">LKR {reportData.total_lkr?.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 font-medium">Cash Payments</p>
                    <p className="text-2xl font-bold text-blue-900 mt-2">LKR {reportData.cash_lkr?.toFixed(2)}</p>
                  </div>
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <p className="text-sm text-cyan-700 font-medium">Card Payments</p>
                    <p className="text-2xl font-bold text-cyan-900 mt-2">LKR {reportData.card_lkr?.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-700 font-medium">RFID Sessions</p>
                    <p className="text-2xl font-bold text-purple-900 mt-2">{reportData.rfid_sessions || 0} sessions</p>
                    <p className="text-xs text-purple-600 mt-1">Monthly subscription</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-700 font-medium">Total Sessions</p>
                    <p className="text-2xl font-bold text-orange-900 mt-2">{reportData.sessions}</p>
                  </div>
                </div>

                {/* Simple Bar Chart */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Method Distribution</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Cash</span>
                        <span className="text-sm font-bold text-gray-900">LKR {reportData.cash_lkr?.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-blue-500 h-4 rounded-full" 
                          style={{ width: `${reportData.total_lkr > 0 ? (reportData.cash_lkr / reportData.total_lkr * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Card</span>
                        <span className="text-sm font-bold text-gray-900">LKR {reportData.card_lkr?.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-cyan-500 h-4 rounded-full" 
                          style={{ width: `${reportData.total_lkr > 0 ? (reportData.card_lkr / reportData.total_lkr * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">RFID Sessions</span>
                        <span className="text-sm font-bold text-gray-900">{reportData.rfid_sessions || 0} sessions</span>
                      </div>
                      <div className="text-xs text-gray-600 italic">
                        Monthly subscription (not per-session revenue)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Report */}
            {reportType === 'vehicle' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Vehicle & User Report</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 font-medium">Total Sessions</p>
                    <p className="text-2xl font-bold text-blue-900 mt-2">{reportData.totalSessions}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 font-medium">Active Sessions</p>
                    <p className="text-2xl font-bold text-green-900 mt-2">{reportData.activeSessions}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 font-medium">Completed Sessions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.completedSessions}</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-3">Vehicle Type Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(reportData.vehicleTypes || {}).map(([type, count]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Type {type}</span>
                        <span className="text-sm font-bold text-gray-900">{count} vehicles</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-indigo-500 h-3 rounded-full" 
                          style={{ width: `${(count / reportData.totalSessions * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operational Report */}
            {reportType === 'operational' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Operational Transaction Log</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 font-medium">Total Transactions</p>
                    <p className="text-2xl font-bold text-blue-900 mt-2">{reportData.totalSessions}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 font-medium">Active</p>
                    <p className="text-2xl font-bold text-green-900 mt-2">{reportData.activeSessions}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 font-medium">Completed</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.completedSessions}</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.sessions?.slice(0, 10).map((session) => (
                        <tr key={session.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{session.vehicle?.plate_number || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{new Date(session.entry_time).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{session.exit_time ? new Date(session.exit_time).toLocaleString() : 'Active'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">
                            {session.calculated_fee_lkr ? `LKR ${session.calculated_fee_lkr}` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Financial Report */}
            {reportType === 'financial' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Financial Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Revenue Breakdown</h3>
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">LKR {reportData.total_lkr?.toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-700 font-medium">Cash</p>
                        <p className="text-2xl font-bold text-blue-900 mt-2">LKR {reportData.cash_lkr?.toFixed(2)}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          {reportData.total_lkr > 0 ? ((reportData.cash_lkr / reportData.total_lkr) * 100).toFixed(1) : 0}% of total
                        </p>
                      </div>
                      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                        <p className="text-sm text-cyan-700 font-medium">Card</p>
                        <p className="text-2xl font-bold text-cyan-900 mt-2">LKR {reportData.card_lkr?.toFixed(2)}</p>
                        <p className="text-xs text-cyan-600 mt-1">
                          {reportData.total_lkr > 0 ? ((reportData.card_lkr / reportData.total_lkr) * 100).toFixed(1) : 0}% of total
                        </p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-purple-700 font-medium">RFID Sessions</p>
                        <p className="text-2xl font-bold text-purple-900 mt-2">{reportData.rfid_sessions || 0} sessions</p>
                        <p className="text-xs text-purple-600 mt-1">
                          Monthly subscription users
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Session Analytics</h3>
                    <div className="space-y-3">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-700 font-medium">Total Sessions</p>
                        <p className="text-3xl font-bold text-orange-900 mt-2">{reportData.sessions}</p>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <p className="text-sm text-indigo-700 font-medium">Average Revenue per Session</p>
                        <p className="text-2xl font-bold text-indigo-900 mt-2">
                          LKR {reportData.sessions > 0 ? (reportData.total_lkr / reportData.sessions).toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
