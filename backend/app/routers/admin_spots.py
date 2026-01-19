from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db.database import get_db
from ..db.models import ParkingSpot, VehicleType
from .admin import get_current_role

router = APIRouter()

class SpotRequest(BaseModel):
    label: str
    type_code: str = None
    type_id: int = None

@router.get('/')
async def list_spots(role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role not in {'Admin', 'Controller'}:
        raise HTTPException(status_code=403, detail='Admin or Controller only')
    return db.query(ParkingSpot).all()

@router.post('/')
async def create_spot(payload: SpotRequest, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != 'Admin':
        raise HTTPException(status_code=403, detail='Admin only')
    
    # Support both type_code and type_id
    if payload.type_id:
        vtype = db.query(VehicleType).filter(VehicleType.id == payload.type_id).first()
    elif payload.type_code:
        vtype = db.query(VehicleType).filter(VehicleType.code == payload.type_code).first()
    else:
        raise HTTPException(status_code=400, detail='Either type_code or type_id is required')
    
    if not vtype:
        raise HTTPException(status_code=404, detail='Vehicle type not found')
    existing = db.query(ParkingSpot).filter(ParkingSpot.label == payload.label).first()
    if existing:
        raise HTTPException(status_code=409, detail='Spot label already exists')
    spot = ParkingSpot(label=payload.label, type_id=vtype.id, is_occupied=False)
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return spot

@router.put('/{spot_id}')
async def update_spot(spot_id: int, payload: SpotRequest, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != 'Admin':
        raise HTTPException(status_code=403, detail='Admin only')
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail='Parking spot not found')
    
    # Update label if provided
    if payload.label and payload.label != spot.label:
        existing = db.query(ParkingSpot).filter(ParkingSpot.label == payload.label).first()
        if existing:
            raise HTTPException(status_code=409, detail='Spot label already exists')
        spot.label = payload.label
    
    # Update type if provided
    if payload.type_id:
        vtype = db.query(VehicleType).filter(VehicleType.id == payload.type_id).first()
        if not vtype:
            raise HTTPException(status_code=404, detail='Vehicle type not found')
        spot.type_id = vtype.id
    elif payload.type_code:
        vtype = db.query(VehicleType).filter(VehicleType.code == payload.type_code).first()
        if not vtype:
            raise HTTPException(status_code=404, detail='Vehicle type not found')
        spot.type_id = vtype.id
    
    db.commit()
    db.refresh(spot)
    return spot

@router.patch('/{spot_id}/status')
async def toggle_spot_status(spot_id: int, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Admin or Controller only')
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail='Parking spot not found')
    
    # Toggle the status
    spot.is_occupied = not spot.is_occupied
    db.commit()
    db.refresh(spot)
    return spot

@router.delete('/{spot_id}')
async def delete_spot(spot_id: int, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != 'Admin':
        raise HTTPException(status_code=403, detail='Admin only')
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail='Parking spot not found')
    if spot.is_occupied:
        raise HTTPException(status_code=409, detail='Cannot delete occupied spot')
    db.delete(spot)
    db.commit()
    return {'message': 'Parking spot deleted successfully'}

# Keep the old endpoint for backward compatibility
@router.delete('/by-label/{label}')
async def delete_spot_by_label(label: str, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != 'Admin':
        raise HTTPException(status_code=403, detail='Admin only')
    spot = db.query(ParkingSpot).filter(ParkingSpot.label == label).first()
    if not spot:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(spot)
    db.commit()
    return {'deleted': label}
