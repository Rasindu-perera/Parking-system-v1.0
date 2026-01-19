from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, EmailStr
import os
from ..db.database import get_db
from ..db.models import RFIDAccount, RFIDVehicle, Vehicle, VehicleType

router = APIRouter(prefix='/admin/rfid', tags=['RFID Accounts'])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
JWT_SECRET = os.getenv("JWT_SECRET", "change_me_secret")
ALGORITHM = "HS256"

async def get_current_role(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        role = payload.get("role")
        if not role:
            raise HTTPException(status_code=401, detail="Role not found in token")
        # Check token expiry
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            raise HTTPException(status_code=401, detail="Token expired")
        return role
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Pydantic models
class VehicleRegistration(BaseModel):
    plate_number: str
    type_id: int

class RFIDAccountCreate(BaseModel):
    rfid_number: str
    full_name: str
    contact_number: str
    email: EmailStr
    national_id: str
    valid_from: str
    valid_to: str
    monthly_payment: float
    vehicles: List[VehicleRegistration]

class RFIDAccountResponse(BaseModel):
    id: int
    rfid_number: str
    full_name: str
    contact_number: str
    email: str
    national_id: str
    valid_from: str
    valid_to: str
    monthly_payment: float
    status: bool
    created_at: str
    vehicles: list

    class Config:
        from_attributes = True

@router.post('/accounts', response_model=RFIDAccountResponse)
async def create_rfid_account(
    account_data: RFIDAccountCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """Create a new RFID account with multiple vehicles (up to 5)"""
    if role not in ['Admin', 'RFID_Registrar']:
        raise HTTPException(status_code=403, detail='Admin or RFID Registrar access required')
    
    # Validate vehicle count
    if len(account_data.vehicles) > 5:
        raise HTTPException(status_code=400, detail='Maximum 5 vehicles allowed per account')
    
    if len(account_data.vehicles) < 1:
        raise HTTPException(status_code=400, detail='At least 1 vehicle required')
    
    # Check if RFID number already exists
    existing = db.query(RFIDAccount).filter(
        RFIDAccount.rfid_number == account_data.rfid_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail='RFID number already registered')
    
    # Check if email already exists
    existing_email = db.query(RFIDAccount).filter(
        RFIDAccount.email == account_data.email
    ).first()
    if existing_email:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    # Parse dates
    try:
        valid_from = datetime.fromisoformat(account_data.valid_from.replace('Z', '+00:00'))
        valid_to = datetime.fromisoformat(account_data.valid_to.replace('Z', '+00:00'))
    except:
        raise HTTPException(status_code=400, detail='Invalid date format')
    
    # Create RFID account
    new_account = RFIDAccount(
        rfid_number=account_data.rfid_number,
        full_name=account_data.full_name,
        contact_number=account_data.contact_number,
        email=account_data.email,
        national_id=account_data.national_id,
        valid_from=valid_from,
        valid_to=valid_to,
        monthly_payment=account_data.monthly_payment,
        status=True
    )
    db.add(new_account)
    db.flush()  # Get the account ID
    
    # Create or link vehicles
    vehicle_list = []
    for veh_data in account_data.vehicles:
        # Check if vehicle already exists
        vehicle = db.query(Vehicle).filter(
            Vehicle.plate_number == veh_data.plate_number.upper()
        ).first()
        
        if not vehicle:
            # Create new vehicle
            vehicle = Vehicle(
                plate_number=veh_data.plate_number.upper(),
                type_id=veh_data.type_id
            )
            db.add(vehicle)
            db.flush()
        
        # Link vehicle to RFID account
        rfid_vehicle = RFIDVehicle(
            account_id=new_account.id,
            vehicle_id=vehicle.id,
            is_active=True
        )
        db.add(rfid_vehicle)
        
        vehicle_list.append({
            'id': vehicle.id,
            'plate_number': vehicle.plate_number,
            'type_id': vehicle.type_id
        })
    
    db.commit()
    db.refresh(new_account)
    
    return {
        'id': new_account.id,
        'rfid_number': new_account.rfid_number,
        'full_name': new_account.full_name,
        'contact_number': new_account.contact_number,
        'email': new_account.email,
        'national_id': new_account.national_id,
        'valid_from': new_account.valid_from.isoformat(),
        'valid_to': new_account.valid_to.isoformat(),
        'monthly_payment': float(new_account.monthly_payment),
        'status': new_account.status,
        'created_at': new_account.created_at.isoformat(),
        'vehicles': vehicle_list
    }

@router.get('/accounts', response_model=List[RFIDAccountResponse])
async def list_rfid_accounts(
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """List all RFID accounts"""
    if role not in ['Admin', 'Accountant', 'RFID_Registrar']:
        raise HTTPException(status_code=403, detail='Access denied')
    
    accounts = db.query(RFIDAccount).all()
    result = []
    
    for account in accounts:
        # Get vehicles for this account
        vehicles = db.query(RFIDVehicle, Vehicle).join(
            Vehicle, RFIDVehicle.vehicle_id == Vehicle.id
        ).filter(
            RFIDVehicle.account_id == account.id
        ).all()
        
        vehicle_list = [{
            'id': veh.id,
            'plate_number': veh.plate_number,
            'type_id': veh.type_id,
            'is_active': rv.is_active
        } for rv, veh in vehicles]
        
        result.append({
            'id': account.id,
            'rfid_number': account.rfid_number,
            'full_name': account.full_name,
            'contact_number': account.contact_number,
            'email': account.email,
            'national_id': account.national_id,
            'valid_from': account.valid_from.isoformat(),
            'valid_to': account.valid_to.isoformat(),
            'monthly_payment': float(account.monthly_payment),
            'status': account.status,
            'created_at': account.created_at.isoformat(),
            'vehicles': vehicle_list
        })
    
    return result

@router.get('/accounts/{account_id}', response_model=RFIDAccountResponse)
async def get_rfid_account(
    account_id: int,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """Get RFID account details"""
    if role not in ['Admin', 'Accountant', 'RFID_Registrar']:
        raise HTTPException(status_code=403, detail='Access denied')
    
    account = db.query(RFIDAccount).filter(RFIDAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    
    # Get vehicles
    vehicles = db.query(RFIDVehicle, Vehicle).join(
        Vehicle, RFIDVehicle.vehicle_id == Vehicle.id
    ).filter(
        RFIDVehicle.account_id == account.id
    ).all()
    
    vehicle_list = [{
        'id': veh.id,
        'plate_number': veh.plate_number,
        'type_id': veh.type_id,
        'is_active': rv.is_active
    } for rv, veh in vehicles]
    
    return {
        'id': account.id,
        'rfid_number': account.rfid_number,
        'full_name': account.full_name,
        'contact_number': account.contact_number,
        'email': account.email,
        'national_id': account.national_id,
        'valid_from': account.valid_from.isoformat(),
        'valid_to': account.valid_to.isoformat(),
        'monthly_payment': float(account.monthly_payment),
        'status': account.status,
        'created_at': account.created_at.isoformat(),
        'vehicles': vehicle_list
    }

@router.put('/accounts/{account_id}/status')
async def update_account_status(
    account_id: int,
    status: bool,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """Activate or deactivate RFID account"""
    if role not in ['Admin']:
        raise HTTPException(status_code=403, detail='Admin access required')
    
    account = db.query(RFIDAccount).filter(RFIDAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    
    account.status = status
    db.commit()
    
    return {'message': 'Account status updated', 'status': status}

class PaymentUpdate(BaseModel):
    monthly_payment: float

class ValidityUpdate(BaseModel):
    valid_to: str

@router.put('/accounts/{account_id}/payment')
async def update_monthly_payment(
    account_id: int,
    payment_data: PaymentUpdate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """Update monthly payment amount for RFID account"""
    if role not in ['Admin', 'RFID_Registrar']:
        raise HTTPException(status_code=403, detail='Admin or RFID Registrar access required')
    
    if payment_data.monthly_payment <= 0:
        raise HTTPException(status_code=400, detail='Payment amount must be greater than zero')
    
    account = db.query(RFIDAccount).filter(RFIDAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    
    account.monthly_payment = payment_data.monthly_payment
    db.commit()
    db.refresh(account)
    
    return {
        'message': 'Monthly payment updated successfully',
        'account_id': account.id,
        'monthly_payment': float(account.monthly_payment)
    }

@router.put('/accounts/{account_id}/validity')
async def update_validity_date(
    account_id: int,
    validity_data: ValidityUpdate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """Update validity date for RFID account"""
    if role not in ['Admin', 'RFID_Registrar']:
        raise HTTPException(status_code=403, detail='Admin or RFID Registrar access required')
    
    account = db.query(RFIDAccount).filter(RFIDAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    
    # Parse and validate date
    try:
        valid_to = datetime.fromisoformat(validity_data.valid_to.replace('Z', '+00:00'))
        if valid_to.date() < datetime.now(timezone.utc).date():
            raise HTTPException(status_code=400, detail='Validity date cannot be in the past')
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid date format')
    
    account.valid_to = valid_to
    db.commit()
    db.refresh(account)
    
    return {
        'message': 'Validity date updated successfully',
        'account_id': account.id,
        'valid_to': account.valid_to.isoformat()
    }

@router.post('/accounts/{account_id}/vehicles')
async def add_vehicle_to_account(
    account_id: int,
    vehicle_data: VehicleRegistration,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """Add a new vehicle to RFID account"""
    if role not in ['Admin', 'RFID_Registrar']:
        raise HTTPException(status_code=403, detail='Admin or RFID Registrar access required')
    
    account = db.query(RFIDAccount).filter(RFIDAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    
    # Check vehicle count
    current_vehicles = db.query(RFIDVehicle).filter(
        RFIDVehicle.account_id == account_id
    ).count()
    
    if current_vehicles >= 5:
        raise HTTPException(status_code=400, detail='Maximum 5 vehicles allowed per account')
    
    # Check if vehicle already exists
    vehicle = db.query(Vehicle).filter(
        Vehicle.plate_number == vehicle_data.plate_number.upper()
    ).first()
    
    if vehicle:
        # Check if already linked to this account
        existing_link = db.query(RFIDVehicle).filter(
            RFIDVehicle.account_id == account_id,
            RFIDVehicle.vehicle_id == vehicle.id
        ).first()
        if existing_link:
            raise HTTPException(status_code=400, detail='Vehicle already linked to this account')
    else:
        # Create new vehicle
        vehicle = Vehicle(
            plate_number=vehicle_data.plate_number.upper(),
            type_id=vehicle_data.type_id
        )
        db.add(vehicle)
        db.flush()
    
    # Link vehicle to account
    rfid_vehicle = RFIDVehicle(
        account_id=account_id,
        vehicle_id=vehicle.id,
        is_active=True
    )
    db.add(rfid_vehicle)
    db.commit()
    
    return {
        'message': 'Vehicle added successfully',
        'vehicle_id': vehicle.id,
        'plate_number': vehicle.plate_number
    }

@router.delete('/accounts/{account_id}/vehicles/{vehicle_id}')
async def remove_vehicle_from_account(
    account_id: int,
    vehicle_id: int,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """Remove a vehicle from RFID account"""
    if role not in ['Admin', 'RFID_Registrar']:
        raise HTTPException(status_code=403, detail='Admin or RFID Registrar access required')
    
    # Check vehicle count
    current_vehicles = db.query(RFIDVehicle).filter(
        RFIDVehicle.account_id == account_id
    ).count()
    
    if current_vehicles <= 1:
        raise HTTPException(status_code=400, detail='At least 1 vehicle required per account')
    
    # Find and remove link
    rfid_vehicle = db.query(RFIDVehicle).filter(
        RFIDVehicle.account_id == account_id,
        RFIDVehicle.vehicle_id == vehicle_id
    ).first()
    
    if not rfid_vehicle:
        raise HTTPException(status_code=404, detail='Vehicle not found in this account')
    
    db.delete(rfid_vehicle)
    db.commit()
    
    return {'message': 'Vehicle removed successfully'}

@router.post('/validate')
async def validate_rfid_for_payment(
    validation_data: dict,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_role)
):
    """Validate RFID account for payment - checks vehicle registration and validity date"""
    if role not in ['Admin', 'Controller', 'RFID_Registrar']:
        raise HTTPException(status_code=403, detail='Access denied')
    
    rfid_number = validation_data.get('rfid_number')
    plate_number = validation_data.get('plate_number')
    
    if not rfid_number:
        raise HTTPException(status_code=400, detail='RFID number is required')
    
    if not plate_number:
        raise HTTPException(status_code=400, detail='Plate number is required')
    
    # Find account by RFID number
    account = db.query(RFIDAccount).filter(
        RFIDAccount.rfid_number == rfid_number
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail='RFID account not found')
    
    # Check if account is active
    if not account.status:
        raise HTTPException(status_code=400, detail='RFID account is inactive')
    
    # Check validity dates
    now = datetime.now(timezone.utc)
    valid_from_aware = account.valid_from.replace(tzinfo=timezone.utc) if account.valid_from.tzinfo is None else account.valid_from
    valid_to_aware = account.valid_to.replace(tzinfo=timezone.utc) if account.valid_to.tzinfo is None else account.valid_to
    
    if now < valid_from_aware:
        raise HTTPException(status_code=400, detail='RFID account not yet valid')
    
    if now > valid_to_aware:
        raise HTTPException(status_code=400, detail=f'RFID account expired on {valid_to_aware.strftime("%Y-%m-%d")}')
    
    # Get registered vehicles and check if plate number matches
    vehicles = db.query(RFIDVehicle, Vehicle).join(
        Vehicle, RFIDVehicle.vehicle_id == Vehicle.id
    ).filter(
        RFIDVehicle.account_id == account.id,
        RFIDVehicle.is_active == True
    ).all()
    
    vehicle_list = [{
        'plate_number': veh.plate_number,
        'type_id': veh.type_id
    } for rv, veh in vehicles]
    
    # Check if the plate number is registered under this RFID account
    registered_plates = [v['plate_number'].upper() for v in vehicle_list]
    if plate_number.upper() not in registered_plates:
        raise HTTPException(
            status_code=400, 
            detail=f'Vehicle {plate_number} is not registered under this RFID account'
        )
    
    return {
        'valid': True,
        'account_id': account.id,
        'rfid_number': account.rfid_number,
        'full_name': account.full_name,
        'valid_from': valid_from_aware.isoformat(),
        'valid_to': valid_to_aware.isoformat(),
        'monthly_payment': float(account.monthly_payment),
        'vehicles': vehicle_list,
        'matched_plate': plate_number,
        'message': 'RFID account is valid for payment'
    }
