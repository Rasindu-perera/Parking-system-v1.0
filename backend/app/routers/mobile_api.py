from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import qrcode
import io
import base64
from decimal import Decimal

from ..db.database import get_db
from ..db.models import ParkingSpot, VehicleType, FeeSchedule, RFIDVehicle, User, MobileUser, MobileBooking, Vehicle
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
import os

router = APIRouter(prefix="/mobile", tags=["Mobile App"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "change_me_secret")
ALGORITHM = "HS256"

# ============================================
# MODELS
# ============================================

class MobileUserRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: str
    
class MobileUserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    user_id: int
    username: str

class VehicleCreate(BaseModel):
    plate_number: str
    type_id: int
    nickname: Optional[str] = None

class BookingCreate(BaseModel):
    plate_number: str
    vehicle_type_id: int
    start_time: str  # ISO format datetime string

class BookingResponse(BaseModel):
    id: str
    qr_code: str
    spot_label: str
    plate_number: str
    start_time: str
    expires_at: str
    total_fee: float
    status: str

class CheckinRequest(BaseModel):
    plate_number: str

class QRValidateRequest(BaseModel):
    qr_data: str

# ============================================
# AUTHENTICATION
# ============================================

@router.post("/register", response_model=TokenResponse)
async def register(user: MobileUserRegister, db: Session = Depends(get_db)):
    """Register new mobile app user"""
    try:
        # Check if username exists
        existing = db.query(MobileUser).filter(MobileUser.username == user.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Check if email exists
        existing_email = db.query(MobileUser).filter(MobileUser.email == user.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Create mobile user
        hashed_password = pwd_context.hash(user.password)
        new_user = MobileUser(
            username=user.username,
            email=user.email,
            password_hash=hashed_password,
            full_name=user.full_name,
            phone=user.phone,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Generate token
        token_data = {"sub": user.username, "role": "Mobile_User", "user_id": new_user.id}
        token = jwt.encode(token_data, JWT_SECRET, algorithm=ALGORITHM)
        
        return TokenResponse(
            token=token,
            user_id=new_user.id,
            username=user.username
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=TokenResponse)
async def login(credentials: MobileUserLogin, db: Session = Depends(get_db)):
    """Login mobile app user"""
    try:
        user = db.query(MobileUser).filter(MobileUser.username == credentials.username).first()
        if not user or not pwd_context.verify(credentials.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")
        
        token_data = {"sub": user.username, "role": "Mobile_User", "user_id": user.id}
        token = jwt.encode(token_data, JWT_SECRET, algorithm=ALGORITHM)
        
        return TokenResponse(
            token=token,
            user_id=user.id,
            username=user.username
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# AVAILABILITY
# ============================================

@router.get("/availability")
async def get_availability(db: Session = Depends(get_db)):
    """Get real-time parking availability"""
    try:
        vehicle_types = db.query(VehicleType).filter(VehicleType.is_active == True).all()
        
        availability_data = []
        for vt in vehicle_types:
            total_spots = db.query(ParkingSpot).filter(
                ParkingSpot.type_id == vt.id
            ).count()
            
            # Count both occupied AND booked spots as unavailable
            occupied = db.query(ParkingSpot).filter(
                ParkingSpot.type_id == vt.id,
                (ParkingSpot.is_occupied == 1) | (ParkingSpot.booking == 1)
            ).count()
            
            availability_data.append({
                "type_id": vt.id,
                "type_name": vt.name,
                "type_code": vt.code,
                "total_spots": total_spots,
                "available_spots": total_spots - occupied,
                "occupied_spots": occupied
            })
        
        total = sum(item["total_spots"] for item in availability_data)
        available = sum(item["available_spots"] for item in availability_data)
        
        return {
            "total_spots": total,
            "available_spots": available,
            "vehicle_types": availability_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# BOOKINGS
# ============================================

@router.post("/bookings", response_model=BookingResponse)
async def create_booking(
    booking: BookingCreate,
    background_tasks: BackgroundTasks,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Create new parking booking (valid for 15 minutes)"""
    try:
        print(f"\n=== BOOKING REQUEST ===")
        print(f"User ID: {user_id}")
        print(f"Plate: {booking.plate_number}")
        print(f"Vehicle Type ID: {booking.vehicle_type_id}")
        
        # Find available spot (not occupied AND not already booked)
        available_spot = db.query(ParkingSpot).filter(
            ParkingSpot.type_id == booking.vehicle_type_id,
            ParkingSpot.is_occupied == 0,
            ParkingSpot.booking == 0
        ).first()
        print(f"Found spot: {available_spot.label if available_spot else 'NONE'}")
        
        if not available_spot:
            # Debug: count total spots for this type
            total_spots = db.query(ParkingSpot).filter(ParkingSpot.type_id == booking.vehicle_type_id).count()
            occupied_spots = db.query(ParkingSpot).filter(
                ParkingSpot.type_id == booking.vehicle_type_id,
                ParkingSpot.is_occupied == 1
            ).count()
            raise HTTPException(
                status_code=400, 
                detail=f"No available spots for vehicle type {booking.vehicle_type_id}. Total: {total_spots}, Occupied: {occupied_spots}"
            )
        
        # Get or create vehicle (with normalized plate matching)
        normalized_plate = booking.plate_number.upper().replace(' ', '').replace('-', '')
        vehicle = None
        
        # Try exact match first
        vehicle = db.query(Vehicle).filter(Vehicle.plate_number == booking.plate_number).first()
        
        # If not found, try normalized matching
        if not vehicle:
            all_vehicles = db.query(Vehicle).all()
            for v in all_vehicles:
                if v.plate_number.upper().replace(' ', '').replace('-', '') == normalized_plate:
                    vehicle = v
                    print(f"✓ Found existing vehicle with plate {v.plate_number} (normalized match)")
                    break
        
        # Create new vehicle if still not found
        if not vehicle:
            vehicle = Vehicle(
                plate_number=booking.plate_number,
                type_id=booking.vehicle_type_id
            )
            db.add(vehicle)
            db.flush()
            print(f"✓ Created new vehicle with plate {booking.plate_number}")
        
        # Parse start time
        start_time = datetime.fromisoformat(booking.start_time.replace('Z', '+00:00'))
        expires_at = start_time + timedelta(minutes=15)
        
        # Calculate fee (simplified - using first 30min band)
        fee_schedule = db.query(FeeSchedule).filter(
            FeeSchedule.type_id == booking.vehicle_type_id,
            FeeSchedule.band_name == "0 to 30min"
        ).first()
        
        total_fee = float(fee_schedule.amount_lkr) if fee_schedule else 0.0
        
        # Generate booking ID (using timestamp)
        booking_id = f"BK{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        
        # Mark spot as RESERVED for booking (booking=1) but NOT occupied yet
        # Spot becomes occupied only when vehicle actually arrives and checks in
        available_spot.booking = 1  # Use integer 1 for TINYINT column
        available_spot.is_occupied = 0  # Not occupied until check-in
        print(f"✓ Reserved spot {available_spot.label} for booking {booking_id} (booking=1, occupied=0)")
        
        # Generate QR code
        qr_data = f"BOOKING-{booking_id}-{booking.plate_number}-{available_spot.label}"
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Create booking record
        new_booking = MobileBooking(
            id=booking_id,
            user_id=user_id,
            vehicle_id=vehicle.id,
            spot_id=available_spot.id,
            start_time=start_time,
            expires_at=expires_at,
            qr_code_data=qr_data,
            is_checked_in=False,
            is_cancelled=False
        )
        db.add(new_booking)
        db.commit()
        
        # Schedule auto-cancellation after 15 minutes
        background_tasks.add_task(auto_cancel_booking, booking_id, available_spot.id, expires_at)
        
        return BookingResponse(
            id=booking_id,
            qr_code=qr_base64,
            spot_label=available_spot.label,
            plate_number=booking.plate_number,
            start_time=start_time.isoformat(),
            expires_at=expires_at.isoformat(),
            total_fee=total_fee,
            status="confirmed"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

async def auto_cancel_booking(booking_id: str, spot_id: int, expires_at: datetime):
    """Auto-cancel booking if vehicle doesn't arrive within 15 minutes"""
    import asyncio
    
    # Wait until expiration time
    now = datetime.now(timezone.utc)
    if expires_at > now:
        wait_seconds = (expires_at - now).total_seconds()
        await asyncio.sleep(wait_seconds)
    
    try:
        from ..db.database import SessionLocal
        session = SessionLocal()
        
        # Check booking status
        booking = session.query(MobileBooking).filter(MobileBooking.id == booking_id).first()
        spot = session.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
        
        # Handle expiration based on customer entry status
        if booking and not booking.is_checked_in and not booking.is_cancelled:
            # Check if spot is occupied (customer has entered but didn't click button)
            if spot and spot.is_occupied == 1:
                # Customer HAS entered but didn't confirm - just clear booking flag
                print(f"✓ Customer entered but didn't confirm - clearing booking flag for spot {spot.label}")
                spot.booking = 0  # Clear booking reservation (customer is parked)
                # Keep is_occupied=1 (customer is still there)
                # Keep booking active (not cancelled, just expired)
                booking.cancellation_reason = "expired_after_entry"
                session.commit()
                print(f"✓ Booking {booking_id} expired - Spot {spot.label}: booking=0, is_occupied=1 (customer parked)")
                session.close()
                return
            
            # Customer HASN'T entered - auto-cancel and free the spot
            booking.is_cancelled = True
            booking.cancelled_at = datetime.now()
            booking.cancellation_reason = "auto-cancelled"
            
            if spot:
                spot.is_occupied = 0
                spot.booking = 0  # Clear booking reservation
            
            session.commit()
            print(f"✓ Auto-cancelled booking {booking_id} - spot {spot.label if spot else spot_id} freed (booking=0, is_occupied=0)")
        
        session.close()
    except Exception as e:
        print(f"Error in auto-cancel: {e}")

@router.post("/bookings/{booking_id}/checkin")
async def checkin_booking(
    booking_id: str,
    checkin_data: CheckinRequest,
    db: Session = Depends(get_db)
):
    """Check in to parking spot with booking"""
    try:
        # Find booking
        booking = db.query(MobileBooking).filter(MobileBooking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking.is_cancelled:
            raise HTTPException(status_code=400, detail="Booking was cancelled")
        
        if booking.is_checked_in:
            raise HTTPException(status_code=400, detail="Already checked in")
        
        # Check if expired (handle both timezone-aware and naive datetimes)
        now = datetime.now(timezone.utc)
        expires_at = booking.expires_at if booking.expires_at.tzinfo else booking.expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            booking.is_cancelled = True
            booking.cancelled_at = datetime.now()
            booking.cancellation_reason = "expired"
            db.commit()
            raise HTTPException(status_code=400, detail="Booking has expired")
        
        # Verify plate number matches booking
        booking_vehicle = db.query(Vehicle).filter(Vehicle.id == booking.vehicle_id).first()
        if not booking_vehicle:
            raise HTTPException(status_code=400, detail="Booking vehicle not found")
        
        # Normalize plate numbers for comparison (remove spaces, hyphens, uppercase)
        booking_plate = booking_vehicle.plate_number.upper().replace(' ', '').replace('-', '')
        entry_plate = checkin_data.plate_number.upper().replace(' ', '').replace('-', '')
        
        print(f"\n🔍 Manual Check-in Plate Verification:")
        print(f"   Booking Plate: {booking_vehicle.plate_number} (normalized: {booking_plate})")
        print(f"   Entry Plate: {checkin_data.plate_number} (normalized: {entry_plate})")
        print(f"   Match: {booking_plate == entry_plate}")
        
        if booking_plate != entry_plate:
            raise HTTPException(
                status_code=400, 
                detail=f"Plate number mismatch. Booking is for {booking_vehicle.plate_number}, you entered {checkin_data.plate_number}"
            )
        
        # Get the parking spot first to check if customer has actually entered
        spot = db.query(ParkingSpot).filter(ParkingSpot.id == booking.spot_id).first()
        if not spot:
            raise HTTPException(status_code=400, detail="Parking spot not found")
        
        # CRITICAL: Check if customer has actually entered (is_occupied must be 1)
        if spot.is_occupied != 1:
            raise HTTPException(
                status_code=400, 
                detail="You haven't entered the parking yet. Please enter through the gate first, then click this button."
            )
        
        print(f"\n✓ Customer has entered! Spot {spot.label} is_occupied={spot.is_occupied}")
        print(f"   Confirming check-in and clearing booking flag...")
        
        # Customer has entered - now confirm the check-in
        booking.is_checked_in = True
        booking.checked_in_at = datetime.now()
        
        # Clear the booking flag (reservation fulfilled)
        spot.booking = 0
        print(f"✓ Manual check-in confirmed: Spot {spot.label} - is_occupied=1, booking=0")
        print(f"✓ Plate verified: {booking_vehicle.plate_number}")
        
        db.commit()
        
        return {
            "success": True,
            "message": "Checked in successfully",
            "booking_id": booking_id,
            "spot_label": spot.label if spot else None,
            "plate_number": booking_vehicle.plate_number
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Check-in error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, db: Session = Depends(get_db)):
    """Manually cancel booking"""
    try:
        # Find booking
        booking = db.query(MobileBooking).filter(MobileBooking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking.is_cancelled:
            raise HTTPException(status_code=400, detail="Booking already cancelled")
        
        if booking.is_checked_in:
            raise HTTPException(status_code=400, detail="Cannot cancel checked-in booking")
        
        # Check if spot is occupied - if so, customer has already entered
        spot = db.query(ParkingSpot).filter(ParkingSpot.id == booking.spot_id).first()
        if spot and spot.is_occupied == 1:
            raise HTTPException(status_code=400, detail="Cannot cancel - customer has already entered parking")
        
        # Cancel booking
        booking.is_cancelled = True
        booking.cancelled_at = datetime.now()
        booking.cancellation_reason = "manual"
        
        # Free up the spot and clear booking reservation
        if spot:
            spot.is_occupied = 0
            spot.booking = 0
        
        db.commit()
        
        return {
            "success": True,
            "message": "Booking cancelled successfully",
            "booking_id": booking_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bookings/active")
async def get_active_bookings(user_id: int, db: Session = Depends(get_db)):
    """Get user's active bookings"""
    try:
        # In production, fetch from bookings table
        return {
            "active_bookings": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bookings/search-by-plate")
async def search_booking_by_plate(plate_number: str, db: Session = Depends(get_db)):
    """Search for active booking by plate number (for gate scanner)"""
    try:
        # Normalize plate number (remove spaces, dashes, convert to uppercase)
        normalized_search = plate_number.upper().replace(' ', '').replace('-', '')
        print(f"\n=== SEARCHING FOR BOOKING ===")
        print(f"Original plate: {plate_number}")
        print(f"Normalized: {normalized_search}")
        
        # Find ALL vehicles with matching normalized plates
        matching_vehicles = []
        all_vehicles = db.query(Vehicle).all()
        
        for v in all_vehicles:
            normalized_db = v.plate_number.upper().replace(' ', '').replace('-', '')
            if normalized_db == normalized_search:
                matching_vehicles.append(v)
                print(f"✓ Found matching vehicle: ID={v.id}, Plate=[{v.plate_number}]")
        
        if not matching_vehicles:
            print(f"❌ No vehicles found with plate matching {plate_number}")
            raise HTTPException(status_code=404, detail=f"Vehicle with plate {plate_number} not found in system")
        
        print(f"✓ Found {len(matching_vehicles)} vehicle(s) with matching plates")
        
        # Find active booking among matching vehicles
        now = datetime.now()
        booking = None
        vehicle = None
        
        for v in matching_vehicles:
            print(f"  Checking vehicle {v.id} for active bookings...")
            booking_check = db.query(MobileBooking).filter(
                MobileBooking.vehicle_id == v.id,
                MobileBooking.is_cancelled == False,
                MobileBooking.is_checked_in == False,
                MobileBooking.expires_at > now
            ).first()
            
            if booking_check:
                booking = booking_check
                vehicle = v
                print(f"  ✓ Found active booking: {booking.id} for vehicle {v.id}")
                break
            else:
                print(f"  ✗ No active booking for vehicle {v.id}")
        
        if not booking:
            print(f"❌ No active booking found for any vehicle with plate {plate_number}")
            # Show all bookings for debugging
            for v in matching_vehicles:
                all_bookings = db.query(MobileBooking).filter(MobileBooking.vehicle_id == v.id).all()
                print(f"  Vehicle {v.id} total bookings: {len(all_bookings)}")
                for b in all_bookings:
                    print(f"    Booking {b.id}: cancelled={b.is_cancelled}, checked_in={b.is_checked_in}, expires={b.expires_at}")
            raise HTTPException(status_code=404, detail="No active booking found for this vehicle")
        
        print(f"✓ Active booking found: {booking.id}")
        
        # Get spot info
        spot = db.query(ParkingSpot).filter(ParkingSpot.id == booking.spot_id).first()
        
        return {
            "booking_id": booking.id,
            "qr_code_data": booking.qr_code_data,
            "plate_number": vehicle.plate_number,
            "spot_label": spot.label if spot else "Unknown",
            "expires_at": booking.expires_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Search error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-qr")
async def validate_qr(request: QRValidateRequest, db: Session = Depends(get_db)):
    """Validate booking QR code at entry gate and auto-check-in"""
    try:
        from ..db.models import ParkingSession
        
        qr_data = request.qr_data
        
        # Parse QR: "BOOKING-{id}-{plate}-{spot}"
        parts = qr_data.split('-')
        
        # Handle plates with hyphens (e.g., ABC-1234)
        if len(parts) < 4 or parts[0] != 'BOOKING':
            raise HTTPException(status_code=400, detail=f"Invalid QR code format: {qr_data}")
        
        booking_id = parts[1]
        spot_label = parts[-1]  # Last part is always spot
        plate_number = '-'.join(parts[2:-1])  # Everything between booking_id and spot
        
        print(f"\n=== GATE ENTRY VALIDATION ===")
        print(f"Booking ID: {booking_id}")
        print(f"Plate: {plate_number}")
        print(f"Spot: {spot_label}")
        
        # Find booking
        booking = db.query(MobileBooking).filter(MobileBooking.id == booking_id).first()
        if not booking:
            return {"valid": False, "message": "Booking not found"}
        
        if booking.is_cancelled:
            return {"valid": False, "message": "Booking was cancelled"}
        
        print(f"✓ QR Code validated - Booking found: {booking_id}")
        print(f"   Expires at: {booking.expires_at}")
        print(f"   Is checked in: {booking.is_checked_in}")
        
        # Get vehicle and spot data to return for form auto-fill
        vehicle = db.query(Vehicle).filter(Vehicle.id == booking.vehicle_id).first()
        spot = db.query(ParkingSpot).filter(ParkingSpot.id == booking.spot_id).first()
        
        if not vehicle or not spot:
            return {"valid": False, "message": "Booking data incomplete"}
        
        # Return booking data for form auto-fill (NO auto check-in)
        print(f"✓ Returning booking data for form auto-fill: {plate_number} → {spot.label}")
        
        return {
            "valid": True,
            "message": "Booking validated - Please complete entry form",
            "booking_id": booking_id,
            "plate_number": plate_number,
            "spot_label": spot.label,
            "vehicle_type": {
                "name": vehicle.vehicle_type.name,
                "code": vehicle.vehicle_type.code
            },
            "vehicle_id": vehicle.id,
            "spot_id": spot.id,
            "is_mobile_booking": True
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Validation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-entry/{booking_id}")
async def check_entry_status(booking_id: str, db: Session = Depends(get_db)):
    """Check if customer has entered the parking (for mobile app polling)"""
    try:
        booking = db.query(MobileBooking).filter(MobileBooking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Check if they've checked in
        if booking.is_checked_in:
            spot = db.query(ParkingSpot).filter(ParkingSpot.id == booking.spot_id).first()
            return {
                "has_entered": True,
                "message": "✓ You have entered the parking! Welcome.",
                "checked_in_at": booking.checked_in_at.isoformat() if booking.checked_in_at else None,
                "spot_label": spot.label if spot else "Unknown"
            }
        
        # Still waiting
        return {
            "has_entered": False,
            "message": "Waiting for entry...",
            "expires_at": booking.expires_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
