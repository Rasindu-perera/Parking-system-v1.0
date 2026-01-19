import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://127.0.0.1:8002';

export default function RFIDAccounts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [accounts, setAccounts] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [newPayment, setNewPayment] = useState('');
  const [editingValidTo, setEditingValidTo] = useState(null);
  const [newValidTo, setNewValidTo] = useState('');
  const [managingVehicles, setManagingVehicles] = useState(null);
  const [vehicleFormData, setVehicleFormData] = useState({ plate_number: '', type_id: '' });
  const [formData, setFormData] = useState({
    rfid_number: '',
    full_name: '',
    contact_number: '',
    email: '',
    national_id: '',
    valid_from: '',
    valid_to: '',
    monthly_payment: '',
    vehicles: [{ plate_number: '', type_id: '' }]
  });

  useEffect(() => {
    fetchAccounts();
    fetchVehicleTypes();
    // Check if we should open the form automatically
    if (location.state?.openForm) {
      setShowForm(true);
    }
  }, []);

  const generateRFIDNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RFID-${timestamp}${random}`;
  };

  useEffect(() => {
    if (showForm && !formData.rfid_number) {
      setFormData(prev => ({ ...prev, rfid_number: generateRFIDNumber() }));
    }
  }, [showForm]);

  const fetchAccounts = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/rfid/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      alert('Failed to load RFID accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/fees/vehicle-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehicleTypes(response.data);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVehicleChange = (index, field, value) => {
    const newVehicles = [...formData.vehicles];
    newVehicles[index][field] = value;
    setFormData(prev => ({ ...prev, vehicles: newVehicles }));
  };

  const addVehicle = () => {
    if (formData.vehicles.length >= 5) {
      alert('Maximum 5 vehicles allowed per account');
      return;
    }
    setFormData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, { plate_number: '', type_id: '' }]
    }));
  };

  const removeVehicle = (index) => {
    if (formData.vehicles.length === 1) {
      alert('At least 1 vehicle required');
      return;
    }
    const newVehicles = formData.vehicles.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, vehicles: newVehicles }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate vehicles
    for (const vehicle of formData.vehicles) {
      if (!vehicle.plate_number || !vehicle.type_id) {
        alert('Please fill all vehicle details');
        return;
      }
    }

    try {
      const token = sessionStorage.getItem('token');
      
      // Convert dates to ISO format
      const submitData = {
        ...formData,
        monthly_payment: parseFloat(formData.monthly_payment),
        vehicles: formData.vehicles.map(v => ({
          plate_number: v.plate_number.toUpperCase(),
          type_id: parseInt(v.type_id)
        }))
      };

      await axios.post(`${API_URL}/admin/rfid/accounts`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('RFID account created successfully!');
      setShowForm(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
      alert(error.response?.data?.detail || 'Failed to create RFID account');
    }
  };

  const resetForm = () => {
    setFormData({
      rfid_number: '',
      full_name: '',
      contact_number: '',
      email: '',
      national_id: '',
      valid_from: '',
      valid_to: '',
      monthly_payment: '',
      vehicles: [{ plate_number: '', type_id: '' }]
    });
  };

  const toggleAccountStatus = async (accountId, currentStatus) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(
        `${API_URL}/admin/rfid/accounts/${accountId}/status?status=${!currentStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Account status updated');
      fetchAccounts();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update account status');
    }
  };

  const startEditPayment = (accountId, currentPayment) => {
    setEditingPayment(accountId);
    setNewPayment(currentPayment);
  };

  const cancelEditPayment = () => {
    setEditingPayment(null);
    setNewPayment('');
  };

  const updateMonthlyPayment = async (accountId) => {
    if (!newPayment || parseFloat(newPayment) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.put(
        `${API_URL}/admin/rfid/accounts/${accountId}/payment`,
        { monthly_payment: parseFloat(newPayment) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Monthly payment updated successfully');
      setEditingPayment(null);
      setNewPayment('');
      fetchAccounts();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert(error.response?.data?.detail || 'Failed to update monthly payment');
    }
  };

  const startEditValidTo = (accountId, currentValidTo) => {
    setEditingValidTo(accountId);
    const date = new Date(currentValidTo);
    setNewValidTo(date.toISOString().split('T')[0]);
  };

  const cancelEditValidTo = () => {
    setEditingValidTo(null);
    setNewValidTo('');
  };

  const updateValidTo = async (accountId) => {
    if (!newValidTo) {
      alert('Please enter a valid date');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.put(
        `${API_URL}/admin/rfid/accounts/${accountId}/validity`,
        { valid_to: newValidTo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Validity date updated successfully');
      setEditingValidTo(null);
      setNewValidTo('');
      fetchAccounts();
    } catch (error) {
      console.error('Error updating validity:', error);
      alert(error.response?.data?.detail || 'Failed to update validity date');
    }
  };

  const openVehicleManager = (account) => {
    setManagingVehicles(account);
    setVehicleFormData({ plate_number: '', type_id: '' });
  };

  const closeVehicleManager = () => {
    setManagingVehicles(null);
    setVehicleFormData({ plate_number: '', type_id: '' });
  };

  const addVehicleToAccount = async () => {
    if (!vehicleFormData.plate_number || !vehicleFormData.type_id) {
      alert('Please enter plate number and select vehicle type');
      return;
    }

    if (managingVehicles.vehicles.length >= 5) {
      alert('Maximum 5 vehicles allowed per account');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/rfid/accounts/${managingVehicles.id}/vehicles`,
        {
          plate_number: vehicleFormData.plate_number.toUpperCase(),
          type_id: parseInt(vehicleFormData.type_id)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Vehicle added successfully');
      setVehicleFormData({ plate_number: '', type_id: '' });
      fetchAccounts();
      // Refresh the managing account data
      const response = await axios.get(`${API_URL}/admin/rfid/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedAccount = response.data.find(a => a.id === managingVehicles.id);
      if (updatedAccount) setManagingVehicles(updatedAccount);
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert(error.response?.data?.detail || 'Failed to add vehicle');
    }
  };

  const removeVehicleFromAccount = async (vehicleId) => {
    if (managingVehicles.vehicles.length <= 1) {
      alert('At least 1 vehicle required per account');
      return;
    }

    if (!confirm('Are you sure you want to remove this vehicle?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(
        `${API_URL}/admin/rfid/accounts/${managingVehicles.id}/vehicles/${vehicleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Vehicle removed successfully');
      fetchAccounts();
      // Refresh the managing account data
      const response = await axios.get(`${API_URL}/admin/rfid/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedAccount = response.data.find(a => a.id === managingVehicles.id);
      if (updatedAccount) setManagingVehicles(updatedAccount);
    } catch (error) {
      console.error('Error removing vehicle:', error);
      alert(error.response?.data?.detail || 'Failed to remove vehicle');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>←</span>
                <span>Back</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">RFID Account Management</h1>
                <p className="text-gray-600 mt-2">Manage RFID accounts and vehicle registrations</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>{showForm ? '✖️' : '➕'}</span>
              <span>{showForm ? 'Cancel' : 'Create New Account'}</span>
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Create RFID Account</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      National ID/Passport *
                    </label>
                    <input
                      type="text"
                      name="national_id"
                      value={formData.national_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* RFID Details */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">RFID Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RFID Number *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        name="rfid_number"
                        value={formData.rfid_number}
                        onChange={handleInputChange}
                        required
                        placeholder="RFID-001234"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, rfid_number: generateRFIDNumber() }))}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                        title="Generate new RFID number"
                      >
                        🔄 Regenerate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Payment (LKR) *
                    </label>
                    <input
                      type="number"
                      name="monthly_payment"
                      value={formData.monthly_payment}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid From *
                    </label>
                    <input
                      type="date"
                      name="valid_from"
                      value={formData.valid_from}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid To *
                    </label>
                    <input
                      type="date"
                      name="valid_to"
                      value={formData.valid_to}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Registration */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">
                    Vehicle Registration (Max 5)
                  </h3>
                  <button
                    type="button"
                    onClick={addVehicle}
                    disabled={formData.vehicles.length >= 5}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    ➕ Add Vehicle
                  </button>
                </div>
                
                <div className="space-y-4">
                  {formData.vehicles.map((vehicle, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-700">Vehicle {index + 1}</h4>
                        {formData.vehicles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVehicle(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✖️ Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Plate Number *
                          </label>
                          <input
                            type="text"
                            value={vehicle.plate_number}
                            onChange={(e) => handleVehicleChange(index, 'plate_number', e.target.value)}
                            required
                            placeholder="ABC-1234"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vehicle Type *
                          </label>
                          <select
                            value={vehicle.type_id}
                            onChange={(e) => handleVehicleChange(index, 'type_id', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select Type</option>
                            {vehicleTypes.map(type => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  ✓ Create RFID Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Accounts List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">RFID Accounts</h2>
          {loading ? (
            <p className="text-center text-gray-600 py-8">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No RFID accounts found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFID Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicles</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Fee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{account.rfid_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{account.full_name}</div>
                        <div className="text-xs text-gray-500">{account.national_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.contact_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.email}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {account.vehicles.map((v, i) => (
                            <div key={i} className="text-sm text-gray-700">{v.plate_number}</div>
                          ))}
                          <button
                            onClick={() => openVehicleManager(account)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-1"
                          >
                            ⚙️ Manage Vehicles
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingValidTo === account.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="date"
                              value={newValidTo}
                              onChange={(e) => setNewValidTo(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                              onClick={() => updateValidTo(account.id)}
                              className="text-green-600 hover:text-green-800 font-medium text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditValidTo}
                              className="text-red-600 hover:text-red-800 font-medium text-xs"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {new Date(account.valid_to).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => startEditValidTo(account.id, account.valid_to)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                              title="Edit validity date"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingPayment === account.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={newPayment}
                              onChange={(e) => setNewPayment(e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              step="0.01"
                              min="0"
                            />
                            <button
                              onClick={() => updateMonthlyPayment(account.id)}
                              className="text-green-600 hover:text-green-800 font-medium text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditPayment}
                              className="text-red-600 hover:text-red-800 font-medium text-xs"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-gray-900">
                              LKR {parseFloat(account.monthly_payment).toFixed(2)}
                            </span>
                            <button
                              onClick={() => startEditPayment(account.id, account.monthly_payment)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                              title="Edit payment"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          account.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {account.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleAccountStatus(account.id, account.status)}
                          className={`${
                            account.status ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                          } font-medium`}
                        >
                          {account.status ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle Management Modal */}
        {managingVehicles && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Manage Vehicles - {managingVehicles.full_name}
                </h2>
                <button
                  onClick={closeVehicleManager}
                  className="text-gray-600 hover:text-gray-800 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Current Vehicles */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Current Vehicles ({managingVehicles.vehicles.length}/5)
                </h3>
                <div className="space-y-2">
                  {managingVehicles.vehicles.map((vehicle) => {
                    const vType = vehicleTypes.find(t => t.id === vehicle.type_id);
                    return (
                      <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-semibold text-gray-900">{vehicle.plate_number}</div>
                          <div className="text-sm text-gray-600">{vType?.name || 'Unknown Type'}</div>
                        </div>
                        <button
                          onClick={() => removeVehicleFromAccount(vehicle.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                          disabled={managingVehicles.vehicles.length <= 1}
                        >
                          ✖️ Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add New Vehicle */}
              {managingVehicles.vehicles.length < 5 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Add New Vehicle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Plate Number *
                      </label>
                      <input
                        type="text"
                        value={vehicleFormData.plate_number}
                        onChange={(e) => setVehicleFormData(prev => ({ ...prev, plate_number: e.target.value }))}
                        placeholder="ABC-1234"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Type *
                      </label>
                      <select
                        value={vehicleFormData.type_id}
                        onChange={(e) => setVehicleFormData(prev => ({ ...prev, type_id: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Type</option>
                        {vehicleTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={addVehicleToAccount}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    ➕ Add Vehicle
                  </button>
                </div>
              )}

              {managingVehicles.vehicles.length >= 5 && (
                <div className="border-t pt-4">
                  <p className="text-center text-gray-600">
                    Maximum of 5 vehicles reached for this account
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeVehicleManager}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
