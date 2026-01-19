from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..db.models import Vehicle, ParkingSession, VehicleType
from .admin import get_current_role
from ..services.fees import calculate_fee
from datetime import datetime, timezone

router = APIRouter()

@router.post('/exit/calculate-fee')
async def exit_calculate_fee(payload: dict, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != 'Controller':
        raise HTTPException(status_code=403, detail='Controller only')
    plate = payload.get('plate')
    vehicle = db.query(Vehicle).filter(Vehicle.plate_number == plate).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    session = db.query(ParkingSession).filter(ParkingSession.vehicle_id == vehicle.id, ParkingSession.status == 'active').first()
    if not session:
        raise HTTPException(status_code=404, detail='Active session not found')
    now = datetime.now(timezone.utc)
    from datetime import datetime as dt
    
    # Ensure entry_time has timezone info
    entry_time = session.entry_time
    if entry_time.tzinfo is None:
        entry_time = entry_time.replace(tzinfo=timezone.utc)
    
    # Calculate duration
    duration_seconds = (now - entry_time).total_seconds()
    hours = int(duration_seconds // 3600)
    minutes = int((duration_seconds % 3600) // 60)
    duration_str = f"{hours}h {minutes}m"
    
    fee = calculate_fee(db, int(vehicle.type_id), dt.fromisoformat(entry_time.isoformat()), now)
    return {
        'session_id': session.id,
        'plate': plate,
        'vehicle_type_id': vehicle.type_id,
        'entry_time': entry_time.isoformat(),
        'exit_time': now.isoformat(),
        'duration': duration_str,
        'fee_lkr': fee
    }
