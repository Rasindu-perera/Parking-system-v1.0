# Mobile App Database Models
# Add these classes to backend/app/db/models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime, timezone

class MobileUser(Base):
    """Mobile app user accounts - separate from admin/controller users"""
    __tablename__ = 'mobile_users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    bookings = relationship('MobileBooking', back_populates='user')


class MobileBooking(Base):
    """Parking spot reservations from mobile app - valid for 15 minutes"""
    __tablename__ = 'mobile_bookings'
    
    id = Column(String(50), primary_key=True)  # Format: timestamp-based ID
    user_id = Column(Integer, ForeignKey('mobile_users.id'), nullable=False)
    vehicle_id = Column(Integer, ForeignKey('vehicles.id'), nullable=False)
    spot_id = Column(Integer, ForeignKey('parking_spots.id'), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_checked_in = Column(Boolean, default=False)
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    is_cancelled = Column(Boolean, default=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(String(50), nullable=True)  # auto-cancelled, manual, expired
    qr_code_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship('MobileUser', back_populates='bookings')
    vehicle = relationship('Vehicle')
    spot = relationship('ParkingSpot')


# Optional: Add booking_id to ParkingSession to link bookings with actual parking sessions
# Add this line to the existing ParkingSession class in models.py:
# booking_id = Column(String(50), ForeignKey('mobile_bookings.id'), nullable=True)
