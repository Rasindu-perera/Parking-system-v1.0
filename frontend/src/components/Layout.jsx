import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Layout({ children, title, role }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('username')
    navigate('/login')
  }

  const navItems = {
    Admin: [
      { label: 'Dashboard', path: '/admin' },
      { label: 'Vehicle Types', path: '/admin/types' },
      { label: 'Fee Schedules', path: '/admin/fees' },
      { label: 'Parking Spots', path: '/admin/spots' },
      { label: 'Users', path: '/admin/users' },
      { label: 'RFID Accounts', path: '/admin/rfid-accounts' },
      { label: 'Reports & Analytics', path: '/admin/reports' },
    ],
    Controller: [
      { label: 'Dashboard', path: '/controller' },
      { label: 'Entry', path: '/controller/entry' },
      { label: 'Exit & Payment', path: '/controller/exit' },
      { label: 'Active Sessions', path: '/controller/sessions' },
    ],
    Accountant: [
      { label: 'Dashboard', path: '/accountant' },
      { label: 'Reports & Analytics', path: '/accountant/reports' },
    ],
    RFID_Registrar: [
      { label: 'Dashboard', path: '/rfid-registrar' },
      { label: 'RFID Accounts', path: '/rfid-registrar/accounts' },
    ],
  }

  const items = navItems[role] || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-primary-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold">Smart Parking System</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm bg-primary-700 px-3 py-1 rounded-full">
                {role}
              </span>
              <button
                onClick={handleLogout}
                className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-md text-sm font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="bg-white hover:bg-primary-50 text-primary-700 font-medium px-4 py-2 rounded-lg shadow-sm border border-primary-200 transition"
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
