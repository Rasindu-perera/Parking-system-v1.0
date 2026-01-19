import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function AdminSpots() {
  const navigate = useNavigate();
  const [spots, setSpots] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    label: '',
    type_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      
      const [spotsRes, typesRes] = await Promise.all([
        axios.get(`${API_URL}/admin/spots/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/fees/vehicle-types`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setSpots(spotsRes.data);
      setVehicleTypes(typesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');
      
      if (editingId) {
        await axios.put(
          `${API_URL}/admin/spots/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Parking spot updated successfully!');
      } else {
        await axios.post(
          `${API_URL}/admin/spots/`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Parking spot created successfully!');
      }
      
      setFormData({ label: '', type_id: '' });
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error('Error saving spot:', error);
      alert(error.response?.data?.detail || 'Failed to save parking spot');
    }
  };

  const handleEdit = (spot) => {
    setFormData({ label: spot.label, type_id: spot.type_id });
    setEditingId(spot.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this parking spot?')) return;
    
    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(
        `${API_URL}/admin/spots/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Parking spot deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting spot:', error);
      alert(error.response?.data?.detail || 'Failed to delete parking spot');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const action = currentStatus ? 'mark as Available' : 'mark as Occupied';
    if (!confirm(`Are you sure you want to ${action} this parking spot?`)) return;
    
    try {
      const token = sessionStorage.getItem('token');
      await axios.patch(
        `${API_URL}/admin/spots/${id}/status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Parking spot status updated successfully!');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.detail || 'Failed to update parking spot status');
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
              <h1 className="text-3xl font-bold text-gray-800">Manage Parking Spots</h1>
              <p className="text-gray-600 mt-2">Add, edit, or remove parking spots</p>
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
              >
                {showForm ? 'Cancel' : '+ Add New Spot'}
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingId ? 'Edit Parking Spot' : 'Add New Parking Spot'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-2">
                    Spot Label
                  </label>
                  <input
                    id="label"
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="e.g., A-01, B-15"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="type_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    id="type_id"
                    value={formData.type_id}
                    onChange={(e) => setFormData({ ...formData, type_id: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select vehicle type</option>
                    {vehicleTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  {editingId ? 'Update Spot' : 'Create Spot'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ label: '', type_id: '' });
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Parking Spots List</h2>
          {loading ? (
            <p className="text-center text-gray-600 py-8">Loading...</p>
          ) : spots.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No parking spots found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spot Label
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {spots.map((spot) => (
                    <tr key={spot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{spot.label}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getVehicleTypeName(spot.type_id)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(spot.id, spot.is_occupied)}
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition ${
                            spot.is_occupied 
                              ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {spot.is_occupied ? 'Occupied' : 'Available'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(spot)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(spot.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={spot.is_occupied}
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
      </div>
    </Layout>
  );
}
