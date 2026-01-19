# Mobile Booking Spot Reservation System

## Overview
Added `booking_id` column to `parking_spots` table to track which spots are reserved for mobile bookings. Spots reserved for mobile bookings are excluded from normal entry mode but available in mobile booking mode.

## Database Changes

### New Column: `parking_spots.booking_id`
- Type: `VARCHAR(50)` NULL
- Purpose: Stores mobile booking ID when spot is reserved
- Index: Added for faster lookups

### Migration SQL
Run: `backend/database_update_booking_spots.sql`

```sql
ALTER TABLE parking_spots 
ADD COLUMN booking_id VARCHAR(50) NULL AFTER is_occupied,
ADD INDEX idx_booking_id (booking_id);
```

## Backend Changes

### 1. `models.py` - Added booking_id field
```python
class ParkingSpot(Base):
    booking_id = Column(String(50), nullable=True)
```

### 2. `mobile_api.py` - Booking Lifecycle

#### When Creating Booking:
- Sets `spot.booking_id = booking_id`
- Marks `spot.is_occupied = True`
- Reserves spot exclusively for that booking

#### When Canceling/Expiring:
- Clears `spot.booking_id = None`
- Marks `spot.is_occupied = False`
- Frees spot for normal use

#### When Checking In:
- Spot remains occupied with booking_id
- Parking session created
- Vehicle can park

### 3. Affected Endpoints:
- `POST /mobile/bookings` - Sets booking_id on spot
- `POST /mobile/bookings/{id}/cancel` - Clears booking_id
- `POST /mobile/validate-qr` - Handles expired bookings, clears booking_id
- `auto_cancel_booking()` - Background task clears booking_id after 15min

## Frontend Changes

### `ControllerEntry.jsx`

#### Spot Filtering Logic:
```javascript
// Normal Mode: Exclude spots with booking_id
const isReservedForBooking = spot.booking_id !== null;
const shouldShow = mobileBookingMode 
  ? isAvailable  // Show all available
  : (isAvailable && !isReservedForBooking);  // Exclude reserved
```

#### Mode Toggle Behavior:
- **Normal Entry Mode**: 
  - Auto-detection with camera OCR
  - Only shows spots NOT reserved for bookings
  - Operator assigns available spots

- **Mobile Booking Mode**:
  - Validates booking via QR/plate
  - Shows ALL spots (including reserved ones)
  - Uses booked spot from database

#### Automatic Refresh:
- Spots list refreshes when toggling between modes
- Ensures accurate availability display

## Usage Flow

### Mobile App User Flow:
1. User opens mobile app
2. Selects vehicle type
3. App shows available spots (not reserved)
4. User books spot **A-002** 
5. Database: `UPDATE parking_spots SET is_occupied=1, booking_id='BK123' WHERE label='A-002'`
6. Booking valid for 15 minutes

### Entry Gate Flow - Mobile Booking:
1. Operator enables "Mobile Booking Mode"
2. Camera detects plate OR operator scans QR
3. System finds booking for vehicle
4. Uses booked spot **A-002** from database
5. Creates entry, opens gate
6. Spot remains occupied

### Entry Gate Flow - Normal Entry:
1. Operator in "Normal Mode" (default)
2. Camera detects plate
3. Spot dropdown shows only NON-RESERVED spots
4. **A-002** is hidden (reserved for booking)
5. Operator selects **A-004** (available)
6. Entry created with A-004

### Auto-Cancel Flow (No Show):
1. Booking expires after 15 minutes
2. Background task runs
3. Database: `UPDATE parking_spots SET is_occupied=0, booking_id=NULL WHERE label='A-002'`
4. Spot **A-002** now available for normal entry

## Benefits

✅ **Prevents Double Booking**: Reserved spots can't be assigned to walk-ins
✅ **Guaranteed Parking**: Mobile users get their reserved spot
✅ **Automatic Cleanup**: Expired bookings free spots automatically
✅ **Mode-Based Access**: Operators see different spots based on mode
✅ **Clear Separation**: Booking spots vs. first-come spots

## Testing Checklist

- [ ] Run database migration SQL
- [ ] Restart backend server
- [ ] Create mobile booking for spot A-002
- [ ] Verify A-002 is hidden in Normal Mode
- [ ] Enable Mobile Booking Mode
- [ ] Verify A-002 appears in dropdown
- [ ] Scan QR code, verify entry uses A-002
- [ ] Wait 15 minutes or cancel booking
- [ ] Verify A-002 reappears in Normal Mode

## Troubleshooting

**Spot not disappearing in Normal Mode?**
- Check `parking_spots.booking_id` is set in database
- Verify frontend filters: `spot.booking_id !== null`

**Can't find booking at gate?**
- Check booking hasn't expired (15 min limit)
- Verify plate normalization (spaces/dashes/case)
- Check backend logs for "SEARCHING FOR BOOKING"

**Spot still reserved after cancel?**
- Verify cancel endpoint clears `booking_id = None`
- Check auto-cancel background task is running
- Manually clear: `UPDATE parking_spots SET booking_id=NULL WHERE label='A-002'`
