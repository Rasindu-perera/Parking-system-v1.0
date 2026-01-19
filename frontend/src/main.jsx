import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import storage from './utils/storage'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AdminTypes from './pages/AdminTypes'
import AdminFees from './pages/AdminFees'
import AdminSpots from './pages/AdminSpots'
import AdminUsers from './pages/AdminUsers'
import AdminCameraSettings from './pages/AdminCameraSettings'
import CameraSettings from './pages/CameraSettings'
import ControllerDashboard from './pages/ControllerDashboard'
import ControllerEntry from './pages/ControllerEntry'
import ControllerExit from './pages/ControllerExit'
import ControllerSessions from './pages/ControllerSessions'
import AccountantDashboard from './pages/AccountantDashboard'
import CameraTest from './pages/CameraTest'
import Reports from './pages/Reports'
import RFIDAccounts from './pages/RFIDAccounts'
import RFIDRegistrarDashboard from './pages/RFIDRegistrarDashboard'

function RequireRole({ role, children }) {
  const token = storage.getItem('token')
  const userRole = storage.getItem('role')
  if (!token || userRole !== role) return <Navigate to="/login" />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<RequireRole role="Admin"><AdminDashboard /></RequireRole>} />
        <Route path="/admin/types" element={<RequireRole role="Admin"><AdminTypes /></RequireRole>} />
        <Route path="/admin/fees" element={<RequireRole role="Admin"><AdminFees /></RequireRole>} />
        <Route path="/admin/spots" element={<RequireRole role="Admin"><AdminSpots /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole role="Admin"><AdminUsers /></RequireRole>} />
        <Route path="/admin/camera-settings" element={<RequireRole role="Admin"><CameraSettings /></RequireRole>} />
        <Route path="/admin/rfid-accounts" element={<RequireRole role="Admin"><RFIDAccounts /></RequireRole>} />
        <Route path="/controller" element={<RequireRole role="Controller"><ControllerDashboard /></RequireRole>} />
        <Route path="/controller/entry" element={<RequireRole role="Controller"><ControllerEntry /></RequireRole>} />
        <Route path="/controller/exit" element={<RequireRole role="Controller"><ControllerExit /></RequireRole>} />
        <Route path="/controller/sessions" element={<RequireRole role="Controller"><ControllerSessions /></RequireRole>} />
        <Route path="/controller/test" element={<RequireRole role="Controller"><CameraTest /></RequireRole>} />
        <Route path="/accountant" element={<RequireRole role="Accountant"><AccountantDashboard /></RequireRole>} />
        <Route path="/accountant/reports" element={<RequireRole role="Accountant"><Reports /></RequireRole>} />
        <Route path="/admin/reports" element={<RequireRole role="Admin"><Reports /></RequireRole>} />
        <Route path="/rfid-registrar" element={<RequireRole role="RFID_Registrar"><RFIDRegistrarDashboard /></RequireRole>} />
        <Route path="/rfid-registrar/accounts" element={<RequireRole role="RFID_Registrar"><RFIDAccounts /></RequireRole>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
