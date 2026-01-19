from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..db.models import ParkingSession, Vehicle, VehicleType, ParkingSpot
from jinja2 import Template

router = APIRouter()

TEMPLATE = Template(
    """
    <!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"UTF-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
        <title>Receipt</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          .row { margin: 6px 0; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Parking Receipt</h2>
        <div class=\"row\"><span class=\"label\">Plate:</span> {{ plate }}</div>
        <div class=\"row\"><span class=\"label\">Vehicle Type:</span> {{ type_name }}</div>
        <div class=\"row\"><span class=\"label\">Spot:</span> {{ spot_label }}</div>
        <div class=\"row\"><span class=\"label\">Entry Time:</span> {{ entry_time }}</div>
        {% if exit_time %}
        <div class=\"row\"><span class=\"label\">Exit Time:</span> {{ exit_time }}</div>
        {% endif %}
        {% if fee_lkr is not none %}
        <div class=\"row\"><span class=\"label\">Fee (LKR):</span> {{ fee_lkr }}</div>
        {% endif %}
        <div class=\"row\"><span class=\"label\">QR Token:</span> {{ qr_token }}</div>
      </body>
    </html>
    """
)

from fastapi.responses import HTMLResponse

@router.get('/receipts/{qr_token}', response_class=HTMLResponse)
async def get_receipt(qr_token: str, db: Session = Depends(get_db)):
    session = db.query(ParkingSession).filter(ParkingSession.qr_token == qr_token).first()
    if not session:
        raise HTTPException(status_code=404, detail='Receipt not found')
    vehicle_id = session.vehicle_id
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    vtype = db.query(VehicleType).filter(VehicleType.id == vehicle.type_id).first() if vehicle else None
    spot_id = session.spot_id
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    html = TEMPLATE.render(
        plate=vehicle.plate_number if vehicle else 'Unknown',
        type_name=vtype.name if vtype else 'Unknown',
        spot_label=spot.label if spot else 'Unknown',
        entry_time=session.entry_time,
        exit_time=session.exit_time,
        fee_lkr=session.calculated_fee_lkr,
        qr_token=session.qr_token,
    )
    return HTMLResponse(content=html)

from pydantic import BaseModel
from typing import Dict, Any

class ExitByQrRequest(BaseModel):
  qr_token: str

@router.post('/exit/by-qr')
async def exit_by_qr(payload: ExitByQrRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    token = payload.qr_token
    session = db.query(ParkingSession).filter(
        ParkingSession.qr_token == token,
        ParkingSession.status == 'active'
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='Active session not found')
    vehicle = db.query(Vehicle).get(int(session.vehicle_id))
    session_id_val = session.id
    return {
        'session_id': session_id_val,
        'plate': vehicle.plate_number if vehicle else None,
        'entry_time': session.entry_time
    }
