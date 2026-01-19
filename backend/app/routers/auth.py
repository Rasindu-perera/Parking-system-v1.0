from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import os

from ..db.database import get_db
from ..db.models import User

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET", "change_me_secret")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/login")
@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username, User.status == True).first()
    if not user or not pwd_context.verify(form_data.password, str(user.password_hash)):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    payload = {
        "sub": user.username,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "role": user.role, "username": user.username}
