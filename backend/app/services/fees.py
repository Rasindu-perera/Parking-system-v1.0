from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..db.models import FeeSchedule

BANDS_ORDER = [
    ("0 to 30min", 0, 30*60),
    ("30min - 1hr", 30*60, 60*60),
    ("1 - 2 hr", 60*60, 2*60*60),
    ("2 - 6 hr", 2*60*60, 6*60*60),
    ("6 - 12 hr", 6*60*60, 12*60*60),
    ("12 - 24 hr", 12*60*60, 24*60*60),
    ("24 hr +", 24*60*60, None),
]

def calculate_fee(db: Session, type_id: int, entry_time: datetime, exit_time: datetime):
    if entry_time.tzinfo is None:
        entry_time = entry_time.replace(tzinfo=timezone.utc)
    if exit_time.tzinfo is None:
        exit_time = exit_time.replace(tzinfo=timezone.utc)
    elapsed = (exit_time - entry_time).total_seconds()
    fees = {f.band_name: f for f in db.query(FeeSchedule).filter(FeeSchedule.type_id == type_id).all()}
    for name, start_s, end_s in BANDS_ORDER:
        band = fees.get(name)
        if band is None:
            continue
        if end_s is None:
            # 24h+ band, apply day-wise multiplier if needed; use flat for now
            return float(band.amount_lkr)
        if start_s <= elapsed < end_s:
            if band.is_free_band:
                return 0.0
            return float(band.amount_lkr)
    return 0.0
