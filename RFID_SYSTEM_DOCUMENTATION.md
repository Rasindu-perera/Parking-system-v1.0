# RFID Account Management System

## Database Tables Created

### 1. `rfid_accounts`
Main table storing RFID account holder information:
- `id` - Primary key
- `rfid_number` - Unique RFID card number (e.g., "RFID-001234")
- `full_name` - Account holder's full name
- `contact_number` - Phone number
- `email` - Email address (unique)
- `national_id` - National ID or Passport number
- `valid_from` - Start date of validity
- `valid_to` - End date of validity
- `monthly_payment` - Monthly subscription fee (LKR)
- `status` - Active/Inactive status
- `created_at` - Account creation timestamp

### 2. `rfid_vehicles`
Junction table linking accounts to multiple vehicles (max 5 per account):
- `id` - Primary key
- `account_id` - Foreign key to rfid_accounts
- `vehicle_id` - Foreign key to vehicles table
- `is_active` - Vehicle active status
- `added_date` - When vehicle was added

## Backend API Endpoints

### POST `/admin/rfid/accounts`
Create new RFID account with vehicles
- **Access**: Admin only
- **Request Body**:
```json
{
  "rfid_number": "RFID-001234",
  "full_name": "John Doe",
  "contact_number": "+94771234567",
  "email": "john@example.com",
  "national_id": "123456789V",
  "valid_from": "2025-01-01",
  "valid_to": "2025-12-31",
  "monthly_payment": 5000.00,
  "vehicles": [
    {
      "plate_number": "ABC-1234",
      "type_id": 1
    },
    {
      "plate_number": "XYZ-5678",
      "type_id": 2
    }
  ]
}
```

### GET `/admin/rfid/accounts`
List all RFID accounts
- **Access**: Admin, Accountant

### GET `/admin/rfid/accounts/{account_id}`
Get specific account details
- **Access**: Admin, Accountant

### PUT `/admin/rfid/accounts/{account_id}/status`
Activate/deactivate account
- **Access**: Admin only
- **Query Parameter**: `status=true` or `status=false`

## Frontend Page

### `/admin/rfid-accounts`
Complete RFID account management interface with:

**Features:**
1. **Create New Account Form**
   - Personal information section
   - RFID details with validity dates
   - Vehicle registration (up to 5 vehicles)
   - Add/remove vehicle functionality
   - Form validation

2. **Accounts List Table**
   - View all accounts with details
   - Display all registered vehicles per account
   - Show validity period
   - Monthly payment amount
   - Active/Inactive status
   - Activate/Deactivate actions

3. **Form Fields:**
   - Full Name (required)
   - National ID/Passport (required)
   - Contact Number (required)
   - Email (required, unique)
   - RFID Number (required, unique)
   - Monthly Payment (LKR)
   - Valid From Date
   - Valid To Date
   - Multiple Vehicle Registration:
     - Plate Number
     - Vehicle Type (dropdown)

## Setup Instructions

### 1. Run Database Migration
```bash
cd backend
python migrate_rfid_tables.py
```

### 2. Restart Backend
The new routes are automatically loaded when you restart the FastAPI server.

### 3. Access the Page
Navigate to: Admin Dashboard → RFID Accounts

## Validation Rules

1. **Maximum 5 vehicles** per RFID account
2. **Minimum 1 vehicle** required
3. **Unique RFID number** - cannot duplicate
4. **Unique email** - one account per email
5. **Valid date range** - Valid To must be after Valid From
6. **Vehicle plate validation** - automatically converted to uppercase

## Navigation

**Admin Dashboard Quick Actions:**
- Added "RFID Accounts" link in navigation menu

**Admin Menu:**
- Dashboard
- Vehicle Types
- Fee Schedules
- Parking Spots
- Users
- **RFID Accounts** ← NEW
- Reports & Analytics

## Payment Integration

RFID accounts are designed for monthly subscription-based parking:
- Monthly payment amount stored per account
- Validity period enforced (valid_from to valid_to)
- Account status can be activated/deactivated
- All vehicles under one account share the same validity

## Use Cases

1. **Regular Parkers**: Users who park frequently can register for RFID access
2. **Company Fleets**: Register multiple company vehicles under one account
3. **Monthly Subscribers**: Pay monthly fee for unlimited parking access
4. **Family Accounts**: Register family vehicles (up to 5) under one account
