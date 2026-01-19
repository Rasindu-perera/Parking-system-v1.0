from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from passlib.context import CryptContext
from ..db.database import get_db
from ..db.models import User

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    status: bool = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    status: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    status: bool

    class Config:
        from_attributes = True

@router.get("/users")
async def get_all_users(db: Session = Depends(get_db)):
    """Get all users"""
    users = db.query(User).all()
    return users

@router.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate role
    valid_roles = ["Admin", "Controller", "Accountant", "RFID_Registrar"]
    if user.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    # Hash password
    hashed_password = pwd_context.hash(user.password)
    
    # Create user
    new_user = User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role,
        status=user.status
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update an existing user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update username if provided
    if user_update.username is not None:
        # Check if new username already exists (excluding current user)
        existing = db.query(User).filter(
            User.username == user_update.username,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        user.username = user_update.username  # type: ignore
    
    # Update password if provided
    if user_update.password is not None:
        user.password_hash = pwd_context.hash(user_update.password)  # type: ignore
    
    # Update role if provided
    if user_update.role is not None:
        valid_roles = ["Admin", "Controller", "Accountant", "RFID_Registrar"]
        if user_update.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        user.role = user_update.role  # type: ignore
    
    # Update status if provided
    if user_update.status is not None:
        user.status = user_update.status  # type: ignore
    
    db.commit()
    db.refresh(user)
    
    return user

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting the last admin
    if str(user.role) == "Admin":  # type: ignore
        admin_count = db.query(User).filter(User.role == "Admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin user")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}
