from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any
from ..db.database import get_db
from ..db.models import Vehicle, VehicleType, ParkingSpot, ParkingSession, MobileBooking
from .admin import get_current_role
from datetime import datetime, timezone
import secrets

class CreateSessionRequest(BaseModel):
    plate: str
    type_code: str
    spot_label: str

class CreateSessionResponse(BaseModel):
    session_id: int
    plate: str
    type_code: str
    spot_label: str
    entry_time: datetime
    qr_token: str
    receipt_url: str

router = APIRouter()

@router.post('/create-session')
async def create_session(payload: CreateSessionRequest, role: str = Depends(get_current_role), db: Session = Depends(get_db)) -> Dict[str, Any]:
    if role != 'Controller' and role != 'Admin':
        # In your flow, entry is typically Guard; using Controller/Admin until Guard UI is added
        raise HTTPException(status_code=403, detail='Not permitted')
    plate = payload.plate
    type_code = payload.type_code
    spot_label = payload.spot_label
    vtype = db.query(VehicleType).filter(VehicleType.code == type_code).first()
    if not vtype:
        raise HTTPException(status_code=404, detail='Vehicle type not found')
    spot = db.query(ParkingSpot).filter(ParkingSpot.label == spot_label, ParkingSpot.type_id == vtype.id).first()
    if not spot:
        raise HTTPException(status_code=404, detail='Spot not found for type')
    # Use explicit comparison for SQLAlchemy Column
    if spot.is_occupied is True:
        raise HTTPException(status_code=409, detail='Spot already occupied')
    
    # Check if this spot has a mobile booking
    has_mobile_booking = spot.booking is True or spot.booking == 1
    mobile_booking = None
    
    print(f"\n🔍 Entry Detection Check:")
    print(f"   Spot: {spot_label}")
    print(f"   Spot booking flag: {spot.booking} (type: {type(spot.booking)})")
    print(f"   Has mobile booking: {has_mobile_booking}")
    
    if has_mobile_booking:
        # Find active mobile booking for this spot
        mobile_booking = db.query(MobileBooking).filter(
            MobileBooking.spot_id == spot.id,
            MobileBooking.is_cancelled == False,
            MobileBooking.is_checked_in == False
        ).first()
        
        print(f"   Found active booking: {mobile_booking is not None}")
        if mobile_booking:
            print(f"   Booking ID: {mobile_booking.id}")
            print(f"   Booking is_cancelled: {mobile_booking.is_cancelled}")
            print(f"   Booking is_checked_in: {mobile_booking.is_checked_in}")
        
        if mobile_booking:
            # Get the vehicle plate from the booking's vehicle relationship
            booking_vehicle = db.query(Vehicle).filter(Vehicle.id == mobile_booking.vehicle_id).first()
            
            if booking_vehicle:
                # Normalize plate numbers for comparison
                booking_plate = booking_vehicle.plate_number.upper().replace(' ', '').replace('-', '')
                entry_plate = plate.upper().replace(' ', '').replace('-', '')
                
                print(f"\n🔍 Plate Comparison:")
                print(f"   Booking Plate: {booking_vehicle.plate_number} (normalized: {booking_plate})")
                print(f"   Entry Plate: {plate} (normalized: {entry_plate})")
                print(f"   Match: {booking_plate == entry_plate}")
                
                if booking_plate == entry_plate:
                    # MATCH! This is the mobile booking customer
                    print(f"✓ MATCH! Auto-checking in mobile booking {mobile_booking.id}")
                    mobile_booking.is_checked_in = True
                    mobile_booking.checked_in_at = datetime.now()
                    
                    # Set booking to 0 (fulfilled) - use integer 0 for TINYINT column
                    spot.booking = 0
                    
                    print(f"✓ Set booking=0, is_checked_in=True for booking {mobile_booking.id}")
                    print(f"✓ Mobile app will detect entry via polling")
                    print(f"   Booking ID: {mobile_booking.id}, is_checked_in: {mobile_booking.is_checked_in}")
                    print(f"   Spot booking value: {spot.booking}")
                else:
                    print(f"⚠️ Plate mismatch - different vehicle entering booked spot")
                    # Different vehicle - this shouldn't happen but allow entry
            else:
                print(f"⚠️ Booking vehicle not found (vehicle_id: {mobile_booking.vehicle_id})")
        else:
            print(f"⚠️ Spot has booking=1 but no active MobileBooking found (might be cancelled/expired)")
    else:
        print(f"   No mobile booking reservation on this spot")
    
    vehicle = db.query(Vehicle).filter(Vehicle.plate_number == plate).first()
    if not vehicle:
        vehicle = Vehicle(plate_number=plate, type_id=vtype.id)
        db.add(vehicle)
        db.flush()
    # mark spot occupied
    spot.is_occupied = 1
    qr_token = secrets.token_urlsafe(24)
    session = ParkingSession(
        vehicle_id=vehicle.id,
        spot_id=spot.id,
        entry_time=datetime.now(timezone.utc),
        entry_source='camera',
        status='active',
        qr_token=qr_token
    )
    db.add(session)
    
    # Flush to ensure all changes (booking=0, is_occupied=1, is_checked_in=True) are tracked
    db.flush()
    
    # Log final state before commit
    if mobile_booking:
        print(f"\n📊 Final State Before Commit:")
        print(f"   Spot {spot.label}: booking={spot.booking}, is_occupied={spot.is_occupied}")
        print(f"   Booking {mobile_booking.id}: is_checked_in={mobile_booking.is_checked_in}")
    
    db.commit()
    db.refresh(session)
    session_id_val = session.id
    
    # Ensure entry_time has timezone info
    entry_time = session.entry_time
    if entry_time.tzinfo is None:
        entry_time = entry_time.replace(tzinfo=timezone.utc)
    
    return {
        'session_id': session_id_val,
        'plate': plate,
        'type_code': type_code,
        'spot_label': spot_label,
        'entry_time': entry_time.isoformat(),
        'qr_token': qr_token,
        'receipt_url': f"/receipts/{qr_token}"
    }
