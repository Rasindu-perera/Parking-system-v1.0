from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
JWT_SECRET = os.getenv("JWT_SECRET", "change_me_secret")
ALGORITHM = "HS256"

router = APIRouter()

ROLES = {"Controller", "Accountant", "Admin", "RFID_Registrar"}

async def get_current_role(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        role = payload.get("role")
        if not role:
            raise HTTPException(status_code=401, detail="Role not found in token")
        # Check token expiry
        exp = payload.get("exp")
        if exp and datetime.now().timestamp() > exp:
            raise HTTPException(status_code=401, detail="Token expired")
        if role not in ROLES:
            raise HTTPException(status_code=403, detail="Invalid role")
        return role
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@router.get("/me")
async def me(role: str = Depends(get_current_role)):
    return {"role": role}

@router.get("/secure/admin-only")
async def admin_only(role: str = Depends(get_current_role)):
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return {"message": "Welcome Admin"}

@router.get("/secure/controller-only")
async def controller_only(role: str = Depends(get_current_role)):
    if role != "Controller":
        raise HTTPException(status_code=403, detail="Controller only")
    return {"message": "Welcome Controller"}

@router.get("/secure/accountant-only")
async def accountant_only(role: str = Depends(get_current_role)):
    if role != "Accountant":
        raise HTTPException(status_code=403, detail="Accountant only")
    return {"message": "Welcome Accountant"}
