# Smart Parking Management System

A comprehensive parking management solution with RFID/QR code integration, mobile booking, automated entry/exit control, and real-time availability tracking.

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Setup Guide](#setup-guide)
- [User Roles & Access](#user-roles--access)
- [How to Use](#how-to-use)
- [Mobile Booking System](#mobile-booking-system)
- [API Documentation](#api-documentation)
- [Network Access](#network-access)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Core Features
- **Automated Entry/Exit Control**: Camera-based license plate recognition with gate control
- **RFID Integration**: RFID card support for regular customers and staff
- **Mobile Booking System**: Customers can book parking spots in advance via mobile app
- **QR Code Check-in**: Mobile bookings generate QR codes for quick entry validation
- **Real-time Availability**: Live parking spot availability tracking
- **Multi-Vehicle Support**: Cars, motorcycles, and trucks with different pricing
- **Fee Management**: Automated fee calculation based on vehicle type and duration
- **Daily Reports**: Financial and occupancy reports for accountants
- **Spot Management**: Admin panel for managing parking spots and pricing

### Advanced Features
- **Plate Number Normalization**: Automatic formatting (e.g., CAV 8537-A → CAV-8537)
- **Duplicate Entry Prevention**: Smart detection to prevent double-booking
- **Auto-cancellation**: Bookings auto-cancel after 15 minutes if not checked in
- **Session Tracking**: Complete parking session history with entry/exit timestamps
- **Role-Based Access Control**: JWT authentication with Controller, Accountant, Admin roles
- **Cross-device Access**: Network-accessible mobile app for customer convenience

## 🏗️ System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│  Backend API     │────▶│  MySQL Database │
│  (Bootstrap)    │     │   (FastAPI)      │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   Frontend   │
                        │ (React+Vite) │
                        └──────────────┘
                               │
                        ┌──────┴──────┐
                        │   Modules   │
                        ├─────────────┤
                        │ Controller  │
                        │ Accountant  │
                        │   Admin     │
                        └─────────────┘
```

## 💻 Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MySQL
- **Authentication**: JWT tokens with role-based access
- **OCR**: EasyOCR for license plate recognition
- **Image Processing**: OpenCV, Pillow
- **Async Support**: asyncio for background tasks

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **HTTP Client**: Axios
- **Routing**: React Router

### Mobile App
- **Technology**: HTML5 + Bootstrap 5.3.0
- **Icons**: Bootstrap Icons
- **Design**: Responsive mobile-first design
- **Deployment**: Python HTTP server

### Infrastructure
- **Deployment**: Docker Compose
- **OS Compatibility**: Linux, Windows
- **Network**: Local network access support

## 🚀 Setup Guide

### Prerequisites
- Python 3.12+
- Node.js 18+
- MySQL 8.0+
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd "Parking System"
```

### 2. Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE parking_management_db;
exit;

# Import schema
mysql -u root -p parking_management_db < database_schema.sql

# Import mobile booking tables
mysql -u root -p parking_management_db < database_update_mobile.sql
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.\.venv\Scripts\activate.bat
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure database connection
# Edit config/database.py with your MySQL credentials

# Run backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
# Access at: http://localhost:5173
```

### 5. Mobile App Setup
```bash
cd mobile-app

# Start HTTP server (for network access)
python -m http.server 8080

# Access at: http://localhost:8080/mobile-test-app.html
# Or from other devices: http://<YOUR-IP>:8080/mobile-test-app.html
```

### 6. Find Your Network IP
```powershell
# Windows PowerShell:
ipconfig | Select-String -Pattern "IPv4"

# Linux/Mac:
ifconfig | grep "inet "
```

Update `mobile-app/mobile-test-app.html` line 491 with your IP:
```javascript
const API_URL = 'http://<YOUR-IP>:8002/mobile';
```

## 👥 User Roles & Access

### Controller
- **Access**: Entry gate control panel
- **Functions**:
  - Create parking entries (manual or camera-based)
  - Validate mobile booking QR codes
  - Auto-fill Vehicle Entry Form from QR data
  - Open/close entry gates
  - View active parking sessions
  - Search by plate number

### Accountant
- **Access**: Financial reports and session management
- **Functions**:
  - View daily revenue reports
  - Calculate parking fees
  - Process checkouts
  - View parking session history
  - Export financial data
  - Track vehicle types and fees

### Admin
- **Access**: Full system administration
- **Functions**:
  - Manage parking spots (add, edit, delete)
  - Configure vehicle types and pricing
  - Set hourly rates per vehicle type
  - Manage user accounts
  - View system-wide analytics
  - Configure RFID cards
  - System settings

### Customer (Mobile App)
- **Access**: Mobile booking interface
- **Functions**:
  - Create account and login
  - View real-time spot availability
  - Book parking spots
  - Generate QR codes for entry
  - Track booking status
  - Cancel bookings
  - View booking history

## 📱 How to Use

### For Customers (Mobile Booking)

#### 1. Registration & Login
1. Open mobile app: `http://<IP>:8080/mobile-test-app.html`
2. Click "Create Account"
3. Enter: Full Name, Email, Phone, Plate Number, Password
4. Login with credentials

#### 2. Book a Parking Spot
1. After login, view available spots
2. Select vehicle type (Car/Motorcycle/Truck)
3. Enter plate number (format: ABC-1234)
4. Click "Book Spot"
5. Receive booking confirmation with QR code

#### 3. Check-in at Gate
**Option A: QR Code (Recommended)**
1. Arrive at parking entrance
2. Show QR code to controller
3. Controller scans QR and validates
4. Entry form auto-fills with your details
5. Controller clicks "Create Entry"
6. Gate opens automatically

**Option B: Camera Entry**
1. Drive up to camera
2. Camera captures plate number
3. System matches with booking
4. Auto check-in if plate matches
5. Gate opens automatically

#### 4. Check Booking Status
- Mobile app shows real-time status:
  - "Pending" - Waiting for check-in
  - "Checked In" - Currently parked
  - "Cancelled" - Booking cancelled

#### 5. Auto-Cancellation
- Bookings auto-cancel after 15 minutes if not checked in
- You'll see cancellation status in the app

### For Controllers (Gate Entry)

#### 1. Login
1. Access frontend: `http://localhost:5173`
2. Login with Controller credentials
3. Navigate to "Controller Entry" page

#### 2. Manual Entry
1. Enter plate number
2. Select vehicle type
3. Optional: Enter RFID card
4. Click "Create Entry"
5. Gate opens if successful

#### 3. Camera-Based Entry
1. Click "Capture from Camera"
2. Upload image or use live camera
3. System reads plate automatically
4. Verify details
5. Click "Create Entry"

#### 4. Mobile Booking Validation
1. Customer shows QR code
2. Enter QR code in "Scan Mobile Booking" field
3. Click 🔍 "Validate QR"
4. **Form auto-fills** with booking data:
   - Plate number
   - Vehicle type
   - Assigned spot
5. **Review details** (auto-filled correctly)
6. Click "Create Entry" manually
7. System checks in booking and opens gate

**Important**: QR validation does NOT auto-check-in. Controller must review and submit manually.

#### 5. Plate Search
1. Enter plate number in search
2. View existing bookings/sessions
3. Prevent duplicate entries

### For Accountants (Reports & Checkout)

#### 1. View Daily Report
1. Login with Accountant credentials
2. Navigate to "Accountant" dashboard
3. Select date
4. View revenue, sessions, vehicle breakdown

#### 2. Process Checkout
1. Go to "Active Sessions"
2. Search by plate number
3. Click "Checkout"
4. System calculates fee based on:
   - Entry time
   - Vehicle type hourly rate
   - Total duration
5. Confirm payment
6. Gate opens for exit

#### 3. Session History
1. View all parking sessions
2. Filter by date, vehicle type, status
3. Export reports

### For Admins (System Management)

#### 1. Manage Parking Spots
1. Login with Admin credentials
2. Navigate to "Spots Management"
3. Add new spot: Enter label (e.g., A-001), floor, zone
4. Edit spot: Change availability, type
5. Delete spot: Remove unused spots

#### 2. Configure Pricing
1. Go to "Vehicle Types & Fees"
2. View current rates:
   - Car: $X/hour
   - Motorcycle: $Y/hour
   - Truck: $Z/hour
3. Update rates as needed

#### 3. User Management
1. Create new staff accounts
2. Assign roles (Controller/Accountant/Admin)
3. Manage permissions

## 🔧 API Documentation

### Base URLs
- **Backend API**: `http://localhost:8002`
- **Mobile API**: `http://localhost:8002/mobile`
- **Admin API**: `http://localhost:8002/admin`
- **Controller API**: `http://localhost:8002/controller`
- **Accountant API**: `http://localhost:8002/accountant`

### Key Endpoints

#### Mobile Booking
```
POST   /mobile/register          - Create customer account
POST   /mobile/login             - Customer login
GET    /mobile/availability      - Get available spots
POST   /mobile/bookings          - Create booking
GET    /mobile/check-entry/{qr}  - Check booking status
POST   /mobile/bookings/{qr}/cancel - Cancel booking
GET    /mobile/bookings/search-by-plate - Search bookings
```

#### Controller Entry
```
POST   /entry/create-session     - Create parking entry
POST   /mobile/validate-qr       - Validate QR (returns data only)
POST   /camera/camera1/capture   - Process camera image
GET    /controller/sessions      - Get all sessions
```

#### Accountant
```
GET    /accountant/daily         - Daily revenue report
POST   /accountant/checkout      - Process checkout
GET    /controller/sessions?status=active - Active sessions
```

#### Admin
```
GET    /admin/spots/             - List all spots
POST   /admin/spots/             - Create spot
PUT    /admin/spots/{id}         - Update spot
DELETE /admin/spots/{id}         - Delete spot
GET    /admin/fees/vehicle-types - List vehicle pricing
```

## 🌐 Network Access

### Enable Network Access for Mobile App

#### 1. Find Your IP Address
```powershell
# Windows:
ipconfig

# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.43.184
```

#### 2. Update Mobile App Configuration
Edit `mobile-app/mobile-test-app.html`:
```javascript
// Line 491 - Change from localhost to your IP
const API_URL = 'http://192.168.43.184:8002/mobile';
```

#### 3. Start Backend with Network Binding
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

#### 4. Start Mobile App Server
```bash
cd mobile-app
python -m http.server 8080
```

#### 5. Access from Other Devices
On the same network, open:
```
http://192.168.43.184:8080/mobile-test-app.html
```

### Firewall Configuration (Windows)
```powershell
# Allow Python HTTP server
New-NetFirewallRule -DisplayName "Python HTTP Server" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow

# Allow Backend API
New-NetFirewallRule -DisplayName "FastAPI Backend" -Direction Inbound -Protocol TCP -LocalPort 8002 -Action Allow
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Cannot connect to server"
**Solution**:
- Verify backend is running: `http://localhost:8002/docs`
- Check IP address is correct in mobile-test-app.html
- Ensure both devices are on same network
- Check firewall allows ports 8002 and 8080

#### 2. "Database connection failed"
**Solution**:
- Verify MySQL is running
- Check credentials in `backend/config/database.py`
- Ensure database `parking_management_db` exists
- Import schema files

#### 3. "QR validation fails"
**Solution**:
- Ensure booking is not cancelled
- Check booking hasn't expired (15 min timeout)
- Verify QR code format (BK...)
- Check database for booking record

#### 4. "Plate number not recognized"
**Solution**:
- Ensure good lighting for camera
- Check plate format (ABC-1234)
- Verify plate is clean and visible
- Try manual entry as fallback

#### 5. "Port already in use"
**Solution**:
```powershell
# Find process using port
netstat -ano | findstr :8002

# Kill process (replace PID)
taskkill /PID <PID> /F
```

#### 6. "Module not found" errors
**Solution**:
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## 📊 System Workflow

### Complete Parking Flow

```
1. Customer Books Online
   ↓
2. QR Code Generated (BK1234567890)
   ↓
3. Customer Arrives at Gate
   ↓
4. Controller Validates QR
   ↓
5. Form Auto-fills (Plate, Vehicle Type, Spot)
   ↓
6. Controller Reviews & Submits
   ↓
7. System Creates Entry Session
   ↓
8. Gate Opens
   ↓
9. Customer Parks
   ↓
10. Customer Leaves
    ↓
11. Accountant Processes Checkout
    ↓
12. Fee Calculated & Displayed
    ↓
13. Payment Confirmed
    ↓
14. Exit Gate Opens
    ↓
15. Spot Available Again
```

## 📝 Important Notes

- **QR Validation**: Does NOT auto-check-in, controller must submit manually after review
- **Plate Format**: System normalizes to ABC-1234 format (removes spaces and suffix letters)
- **Booking Timeout**: 15 minutes from booking time before auto-cancellation
- **Camera Detection**: Best results with good lighting and clean plates
- **Network Security**: Use VPN or secure network for production deployment
- **Database Backups**: Regular backups recommended for production use

## 📚 Additional Documentation

- **RFID System**: See `RFID_SYSTEM_DOCUMENTATION.md`
- **Booking System**: See `BOOKING_RESERVATION_SYSTEM.md`
- **Logo Setup**: See `LOGO_SETUP.md`
- **Mobile App**: See `mobile-app/MOBILE_APP_README.md`

## 🔐 Default Credentials

### Staff Accounts (Configure in database)
```
Controller:
  Username: controller
  Password: [set in database]

Accountant:
  Username: accountant
  Password: [set in database]

Admin:
  Username: admin
  Password: [set in database]
```

### Customer Accounts
Create via mobile app registration

## 📞 Support

For issues or questions:
1. Check this README
2. Review additional documentation in `docs/`
3. Check API docs at `http://localhost:8002/docs`
4. Review troubleshooting section

## 🎯 Future Enhancements

- Payment gateway integration
- SMS notifications
- Email receipts
- Mobile app (native iOS/Android)
- Advanced analytics dashboard
- Multi-location support
- Subscription plans for regular customers

---

**Version**: 1.0  
**Last Updated**: December 7, 2025  
**License**: Proprietary
