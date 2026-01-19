from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db.database import get_db
from ..db.models import Payment, ParkingSession
from .admin import get_current_role
from datetime import datetime, date, timezone

router = APIRouter()

@router.get('/daily')
async def daily_total(date_str: str, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    if role not in ['Accountant', 'Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Not permitted')
    # Parse date
    d = datetime.strptime(date_str, '%Y-%m-%d').date()
    start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    end = datetime(d.year, d.month, d.day, tzinfo=timezone.utc).replace(hour=23, minute=59, second=59)
    total_lkr = db.query(func.coalesce(func.sum(Payment.amount_lkr), 0)).filter(Payment.timestamp >= start, Payment.timestamp <= end).scalar()
    cash_lkr = db.query(func.coalesce(func.sum(Payment.amount_lkr), 0)).filter(Payment.timestamp >= start, Payment.timestamp <= end, Payment.method == 'cash').scalar()
    card_lkr = db.query(func.coalesce(func.sum(Payment.amount_lkr), 0)).filter(Payment.timestamp >= start, Payment.timestamp <= end, Payment.method == 'card').scalar()
    
    # RFID: Count sessions instead of amount (RFID users pay monthly, not per session)
    rfid_sessions = db.query(func.count(Payment.id)).filter(Payment.timestamp >= start, Payment.timestamp <= end, Payment.method == 'rfid').scalar()
    
    sessions_count = db.query(func.count(ParkingSession.id)).filter(ParkingSession.exit_time >= start, ParkingSession.exit_time <= end).scalar()
    return {
        'date': date_str,
        'total_lkr': float(total_lkr),
        'cash_lkr': float(cash_lkr),
        'card_lkr': float(card_lkr),
        'rfid_lkr': 0.0,  # RFID users pay monthly, not per session
        'rfid_sessions': int(rfid_sessions),
        'sessions': int(sessions_count)
    }

@router.get('/monthly')
async def monthly_summary(year: int, month: int, role: str = Depends(get_current_role), db: Session = Depends(get_db)):
    """Get monthly summary of revenue and sessions"""
    if role not in ['Accountant', 'Admin']:
        raise HTTPException(status_code=403, detail='Not permitted')
    
    # Get first and last day of the month
    from calendar import monthrange
    first_day = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day_num = monthrange(year, month)[1]
    last_day = datetime(year, month, last_day_num, 23, 59, 59, tzinfo=timezone.utc)
    
    # Total revenue for the month
    total_lkr = db.query(func.coalesce(func.sum(Payment.amount_lkr), 0)).filter(
        Payment.timestamp >= first_day, 
        Payment.timestamp <= last_day
    ).scalar()
    
    # Breakdown by payment method
    cash_lkr = db.query(func.coalesce(func.sum(Payment.amount_lkr), 0)).filter(
        Payment.timestamp >= first_day, 
        Payment.timestamp <= last_day, 
        Payment.method == 'cash'
    ).scalar()
    
    card_lkr = db.query(func.coalesce(func.sum(Payment.amount_lkr), 0)).filter(
        Payment.timestamp >= first_day, 
        Payment.timestamp <= last_day, 
        Payment.method == 'card'
    ).scalar()
    
    # RFID sessions count
    rfid_sessions = db.query(func.count(Payment.id)).filter(
        Payment.timestamp >= first_day, 
        Payment.timestamp <= last_day, 
        Payment.method == 'rfid'
    ).scalar()
    
    # Total sessions
    sessions_count = db.query(func.count(ParkingSession.id)).filter(
        ParkingSession.exit_time >= first_day, 
        ParkingSession.exit_time <= last_day
    ).scalar()
    
    # Daily breakdown for the month
    daily_data = []
    for day in range(1, last_day_num + 1):
        day_start = datetime(year, month, day, tzinfo=timezone.utc)
        day_end = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
        
        day_total = db.query(func.coalesce(func.sum(Payment.amount_lkr), 0)).filter(
            Payment.timestamp >= day_start, 
            Payment.timestamp <= day_end
        ).scalar()
        
        day_sessions = db.query(func.count(ParkingSession.id)).filter(
            ParkingSession.exit_time >= day_start, 
            ParkingSession.exit_time <= day_end
        ).scalar()
        
        daily_data.append({
            'day': day,
            'revenue': float(day_total),
            'sessions': int(day_sessions)
        })
    
    return {
        'year': year,
        'month': month,
        'month_name': first_day.strftime('%B'),
        'total_revenue': float(total_lkr),
        'cash_revenue': float(cash_lkr),
        'card_revenue': float(card_lkr),
        'rfid_sessions': int(rfid_sessions),
        'total_sessions': int(sessions_count),
        'daily_data': daily_data,
        'average_daily_revenue': float(total_lkr) / last_day_num if last_day_num > 0 else 0,
        'average_daily_sessions': int(sessions_count) / last_day_num if last_day_num > 0 else 0
    }
