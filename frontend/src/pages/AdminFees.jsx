import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function AdminFees() {
  const navigate = useNavigate();
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [feeSchedules, setFeeSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    band_name: '',
    amount_lkr: '',
    is_free_band: false
  });

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      fetchFeeSchedules(selectedTypeId);
    }
  }, [selectedTypeId]);

  const fetchVehicleTypes = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${API_URL}/admin/fees/vehicle-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehicleTypes(res.data);
      if (res.data.length > 0 && !selectedTypeId) {
        setSelectedTypeId(res.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      alert('Failed to fetch vehicle types');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeSchedules = async (typeId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${API_URL}/admin/fees/fee-schedules/${typeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeSchedules(res.data);
    } catch (error) {
      console.error('Error fetching fee schedules:', error);
      alert('Failed to fetch fee schedules');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');
      
      if (editingId) {
        await axios.put(
          `${API_URL}/admin/fees/fee-schedules/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Fee schedule updated successfully!');
      } else {
        await axios.post(
          `${API_URL}/admin/fees/fee-schedules/${selectedTypeId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Fee schedule created successfully!');
      }
      
      setFormData({ band_name: '', amount_lkr: '', is_free_band: false });
      setShowForm(false);
      setEditingId(null);
      fetchFeeSchedules(selectedTypeId);
    } catch (error) {
      console.error('Error saving fee schedule:', error);
      alert(error.response?.data?.detail || 'Failed to save fee schedule');
    }
  };

  const handleEdit = (fee) => {
    setFormData({
      band_name: fee.band_name,
      amount_lkr: fee.amount_lkr,
      is_free_band: fee.is_free_band
    });
    setEditingId(fee.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this fee schedule?')) return;
    
    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(
        `${API_URL}/admin/fees/fee-schedules/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Fee schedule deleted successfully!');
      fetchFeeSchedules(selectedTypeId);
    } catch (error) {
      console.error('Error deleting fee schedule:', error);
      alert(error.response?.data?.detail || 'Failed to delete fee schedule');
    }
  };

  const getVehicleTypeName = (typeId) => {
    const type = vehicleTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Manage Fees</h1>
              <p className="text-gray-600 mt-2">Configure parking fee schedules</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/admin')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
                disabled={!selectedTypeId}
              >
                {showForm ? 'Cancel' : '+ Add Fee Schedule'}
              </button>
            </div>
          </div>
        </div>

        {/* Vehicle Type Selector */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Select Vehicle Type</h2>
          {loading ? (
            <p className="text-center text-gray-600 py-4">Loading...</p>
          ) : vehicleTypes.length === 0 ? (
            <p className="text-center text-gray-600 py-4">No vehicle types found</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vehicleTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedTypeId(type.id)}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedTypeId === type.id
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-primary-400'
                  }`}
                >
                  <div className="text-lg font-bold">{type.name}</div>
                  <div className="text-sm text-gray-600">{type.code}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingId ? 'Edit Fee Schedule' : 'Add New Fee Schedule'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="band_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Time Band
                  </label>
                  <input
                    id="band_name"
                    type="text"
                    value={formData.band_name}
                    onChange={(e) => setFormData({ ...formData, band_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="e.g., 0-30m, 30m-1h, 1-2h"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="amount_lkr" className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (LKR)
                  </label>
                  <input
                    id="amount_lkr"
                    type="number"
                    step="0.01"
                    value={formData.amount_lkr}
                    onChange={(e) => setFormData({ ...formData, amount_lkr: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_free_band}
                      onChange={(e) => setFormData({ ...formData, is_free_band: e.target.checked })}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Free Band</span>
                  </label>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  {editingId ? 'Update Fee Schedule' : 'Create Fee Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ band_name: '', amount_lkr: '', is_free_band: false });
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Fee Schedules Table */}
        {selectedTypeId && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Fee Schedules for {getVehicleTypeName(selectedTypeId)}
            </h2>
            {feeSchedules.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No fee schedules found for this vehicle type</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Band
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount (LKR)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Free Band
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {feeSchedules.map((fee) => (
                      <tr key={fee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{fee.band_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{parseFloat(fee.amount_lkr).toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            fee.is_free_band
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {fee.is_free_band ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(fee)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(fee.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
