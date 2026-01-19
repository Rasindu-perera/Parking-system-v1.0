from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...db.database import get_db
from ...db.models import VehicleType, FeeSchedule
from ..admin import get_current_role

router = APIRouter()

@router.get("/vehicle-types")
async def list_vehicle_types(role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role not in {"Admin", "Controller", "RFID_Registrar"}:
        raise HTTPException(status_code=403, detail="Admin, Controller or RFID_Registrar only")
    return db.query(VehicleType).all()

@router.post("/vehicle-types")
async def create_vehicle_type(data: dict, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    vt = VehicleType(code=data.get("code"), name=data.get("name"), is_active=True)
    db.add(vt)
    db.commit()
    db.refresh(vt)
    return vt

@router.put("/vehicle-types/{type_id}")
async def update_vehicle_type(type_id: int, data: dict, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    vt = db.query(VehicleType).filter(VehicleType.id == type_id).first()
    if not vt:
        raise HTTPException(status_code=404, detail="Vehicle type not found")
    if data.get("name"):
        vt.name = data.get("name")
    db.commit()
    db.refresh(vt)
    return vt

@router.delete("/vehicle-types/{type_id}")
async def delete_vehicle_type(type_id: int, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    vt = db.query(VehicleType).filter(VehicleType.id == type_id).first()
    if not vt:
        raise HTTPException(status_code=404, detail="Vehicle type not found")
    db.delete(vt)
    db.commit()
    return {"message": "Vehicle type deleted successfully"}

@router.get("/fee-schedules/{type_id}")
async def list_fees(type_id: int, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role not in {"Admin", "Accountant"}:
        raise HTTPException(status_code=403, detail="Not permitted")
    return db.query(FeeSchedule).filter(FeeSchedule.type_id == type_id).all()

@router.post("/fee-schedules/{type_id}")
async def upsert_fee(type_id: int, data: dict, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    band = data.get("band_name")
    amount = data.get("amount_lkr")
    is_free = bool(data.get("is_free_band", False))
    existing = db.query(FeeSchedule).filter(FeeSchedule.type_id==type_id, FeeSchedule.band_name==band).first()
    if existing:
        existing.amount_lkr = amount
        existing.is_free_band = is_free
    else:
        existing = FeeSchedule(type_id=type_id, band_name=band, amount_lkr=amount, is_free_band=is_free)
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

@router.put("/fee-schedules/{schedule_id}")
async def update_fee_schedule(schedule_id: int, data: dict, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    fee = db.query(FeeSchedule).filter(FeeSchedule.id == schedule_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee schedule not found")
    
    if data.get("band_name"):
        fee.band_name = data.get("band_name")
    if "amount_lkr" in data:
        fee.amount_lkr = data.get("amount_lkr")
    if "is_free_band" in data:
        fee.is_free_band = bool(data.get("is_free_band"))
    
    db.commit()
    db.refresh(fee)
    return fee

@router.delete("/fee-schedules/{schedule_id}")
async def delete_fee_schedule(schedule_id: int, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    fee = db.query(FeeSchedule).filter(FeeSchedule.id == schedule_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee schedule not found")
    db.delete(fee)
    db.commit()
    return {"message": "Fee schedule deleted successfully"}
