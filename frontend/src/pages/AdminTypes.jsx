import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function AdminTypes() {
  const navigate = useNavigate();
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: ''
  });

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const fetchVehicleTypes = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/admin/fees/vehicle-types`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVehicleTypes(response.data);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      alert('Failed to fetch vehicle types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');
      
      if (editingId) {
        // Update existing type
        await axios.put(
          `${API_URL}/admin/fees/vehicle-types/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Vehicle type updated successfully!');
      } else {
        // Create new type
        await axios.post(
          `${API_URL}/admin/fees/vehicle-types`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Vehicle type created successfully!');
      }
      
      setFormData({ code: '', name: '' });
      setShowForm(false);
      setEditingId(null);
      fetchVehicleTypes();
    } catch (error) {
      console.error('Error saving vehicle type:', error);
      alert(error.response?.data?.detail || 'Failed to save vehicle type');
    }
  };

  const handleEdit = (type) => {
    setFormData({ code: type.code, name: type.name });
    setEditingId(type.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle type?')) return;
    
    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(
        `${API_URL}/admin/fees/vehicle-types/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Vehicle type deleted successfully!');
      fetchVehicleTypes();
    } catch (error) {
      console.error('Error deleting vehicle type:', error);
      alert(error.response?.data?.detail || 'Failed to delete vehicle type');
    }
  };

  const handleCancel = () => {
    setFormData({ code: '', name: '' });
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Manage Vehicle Types</h1>
              <p className="text-gray-600 mt-2">Add, edit, or remove vehicle types</p>
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
                {showForm ? 'Cancel' : '+ Add New Type'}
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingId ? 'Edit Vehicle Type' : 'Add New Vehicle Type'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                    Type Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="e.g., CAR, MOTO, HEAVY"
                    required
                    disabled={editingId !== null}
                  />
                </div>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Type Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="e.g., Car, Motorcycle, Heavy Vehicle"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  {editingId ? 'Update Type' : 'Create Type'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Vehicle Types List</h2>
          {loading ? (
            <p className="text-center text-gray-600 py-8">Loading...</p>
          ) : vehicleTypes.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No vehicle types found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicleTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                          {type.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{type.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(type.id)}
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
      </div>
    </Layout>
  );
}
