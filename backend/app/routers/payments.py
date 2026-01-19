from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal
from typing import Dict, Any
from ..db.database import get_db
from ..db.models import ParkingSession, Payment, User, RFIDAccount, Vehicle, ParkingSpot
from .admin import get_current_role
from ..services.fees import calculate_fee
from datetime import datetime, timezone

class CashPaymentRequest(BaseModel):
    session_id: int
    cashier: str | None = None

class PaymentResponse(BaseModel):
    session_id: int
    fee_lkr: Decimal
    status: str

class RFIDPaymentRequest(BaseModel):
    session_id: int
    rfid_tag: str

router = APIRouter()

@router.post('/cash')
async def pay_cash(payload: CashPaymentRequest, role: str = Depends(get_current_role), db: Session = Depends(get_db)) -> Dict[str, Any]:
    if role != 'Controller' and role != 'Admin':
        raise HTTPException(status_code=403, detail='Not permitted')
    session_id = payload.session_id
    cashier_username = payload.cashier
    session = db.query(ParkingSession).filter(ParkingSession.id == session_id, ParkingSession.status == 'active').first()
    if not session:
        raise HTTPException(status_code=404, detail='Active session not found')
    vehicle_id = session.vehicle_id
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    now = datetime.now(timezone.utc)
    from datetime import datetime as dt
    vehicle_type_id = vehicle.type_id
    fee_val = Decimal(str(calculate_fee(db, int(vehicle_type_id), dt.fromisoformat(session.entry_time.isoformat()), now)))
    setattr(session, 'exit_time', now)
    setattr(session, 'status', 'closed')
    setattr(session, 'payment_method', 'cash')
    setattr(session, 'payment_status', 'paid')
    setattr(session, 'calculated_fee_lkr', fee_val)
    cashier = db.query(User).filter(User.username == cashier_username).first()
    session_id_val = session.id
    payment = Payment(session_id=session_id_val, method='cash', amount_lkr=fee_val, cashier_id=cashier.id if cashier else None)
    db.add(payment)
    # free the spot
    spot_id = session.spot_id
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if spot:
        setattr(spot, 'is_occupied', False)
    db.commit()
    return {'session_id': session_id_val, 'fee_lkr': fee_val, 'status': 'paid', 'payment_method': 'cash'}

@router.post('/card')
async def pay_card(payload: CashPaymentRequest, role: str = Depends(get_current_role), db: Session = Depends(get_db)) -> Dict[str, Any]:
    if role != 'Controller' and role != 'Admin':
        raise HTTPException(status_code=403, detail='Not permitted')
    session_id = payload.session_id
    cashier_username = payload.cashier
    session = db.query(ParkingSession).filter(ParkingSession.id == session_id, ParkingSession.status == 'active').first()
    if not session:
        raise HTTPException(status_code=404, detail='Active session not found')
    vehicle_id = session.vehicle_id
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    now = datetime.now(timezone.utc)
    from datetime import datetime as dt
    vehicle_type_id = vehicle.type_id
    fee_val = Decimal(str(calculate_fee(db, int(vehicle_type_id), dt.fromisoformat(session.entry_time.isoformat()), now)))
    setattr(session, 'exit_time', now)
    setattr(session, 'status', 'closed')
    setattr(session, 'payment_method', 'card')
    setattr(session, 'payment_status', 'paid')
    setattr(session, 'calculated_fee_lkr', fee_val)
    cashier = db.query(User).filter(User.username == cashier_username).first()
    session_id_val = session.id
    payment = Payment(session_id=session_id_val, method='card', amount_lkr=fee_val, cashier_id=cashier.id if cashier else None)
    db.add(payment)
    # free the spot
    spot_id = session.spot_id
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if spot:
        setattr(spot, 'is_occupied', False)
    db.commit()
    return {'session_id': session_id_val, 'fee_lkr': fee_val, 'status': 'paid', 'payment_method': 'card'}

@router.post('/rfid')
async def pay_rfid(payload: RFIDPaymentRequest, role: str = Depends(get_current_role), db: Session = Depends(get_db)) -> Dict[str, Any]:
    if role != 'Controller' and role != 'Admin':
        raise HTTPException(status_code=403, detail='Not permitted')
    session_id = payload.session_id
    rfid_tag = payload.rfid_tag
    session = db.query(ParkingSession).filter(ParkingSession.id == session_id, ParkingSession.status == 'active').first()
    if not session:
        raise HTTPException(status_code=404, detail='Active session not found')
    
    # Query using correct field name: rfid_number (not rfid_tag)
    account = db.query(RFIDAccount).filter(
        RFIDAccount.rfid_number == rfid_tag,
        RFIDAccount.status == True
    ).first()
    
    if not account:
        raise HTTPException(status_code=400, detail='Invalid RFID account')
    
    # Check validity dates
    now = datetime.now(timezone.utc)
    valid_from_aware = account.valid_from.replace(tzinfo=timezone.utc) if account.valid_from.tzinfo is None else account.valid_from
    valid_to_aware = account.valid_to.replace(tzinfo=timezone.utc) if account.valid_to.tzinfo is None else account.valid_to
    
    if now < valid_from_aware:
        raise HTTPException(status_code=400, detail='RFID pass not yet valid')
    
    if now > valid_to_aware:
        raise HTTPException(status_code=400, detail=f'RFID pass expired on {valid_to_aware.strftime("%Y-%m-%d")}')
    
    # Assume monthly pass covers full fee; set to 0
    setattr(session, 'exit_time', now)
    setattr(session, 'status', 'closed')
    setattr(session, 'payment_method', 'rfid')
    setattr(session, 'payment_status', 'paid')
    setattr(session, 'calculated_fee_lkr', Decimal('0'))
    session_id_val = session.id
    payment = Payment(session_id=session_id_val, method='rfid', amount_lkr=Decimal('0'))
    db.add(payment)
    spot_id = session.spot_id
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if spot:
        setattr(spot, 'is_occupied', False)
    db.commit()
    return {'session_id': session_id_val, 'fee_lkr': Decimal('0'), 'status': 'paid', 'payment_method': 'rfid'}
