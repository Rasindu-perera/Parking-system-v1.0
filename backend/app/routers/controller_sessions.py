from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..db.database import get_db
from ..db.models import ParkingSession, Vehicle, ParkingSpot
from .admin import get_current_role

router = APIRouter()

@router.get('/sessions')
async def list_sessions(
    status: Optional[str] = Query(None, description="Filter by status: 'active' or 'closed'"),
    role: str = Depends(get_current_role),
    db: Session = Depends(get_db)
):
    if role != 'Controller' and role != 'Admin':
        raise HTTPException(status_code=403, detail='Not permitted')
    
    query = db.query(ParkingSession)
    
    if status:
        query = query.filter(ParkingSession.status == status)
    
    sessions = query.order_by(ParkingSession.entry_time.desc()).all()
    
    result = []
    for session in sessions:
        vehicle = db.query(Vehicle).filter(Vehicle.id == session.vehicle_id).first()
        spot = db.query(ParkingSpot).filter(ParkingSpot.id == session.spot_id).first()
        
        result.append({
            'id': session.id,
            'vehicle': {
                'plate_number': vehicle.plate_number if vehicle else None,
                'type_id': vehicle.type_id if vehicle else None
            },
            'spot_id': session.spot_id,
            'spot_label': spot.label if spot else None,
            'entry_time': session.entry_time,
            'exit_time': session.exit_time,
            'status': session.status,
            'payment_method': session.payment_method,
            'payment_status': session.payment_status,
            'calculated_fee_lkr': float(session.calculated_fee_lkr) if session.calculated_fee_lkr else None,
            'qr_token': session.qr_token
        })
    
    return result
