from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # Controller | Accountant | Admin | RFID_Registrar
    status = Column(Boolean, default=True)

class VehicleType(Base):
    __tablename__ = 'vehicle_types'
    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)

class ParkingSpot(Base):
    __tablename__ = 'parking_spots'
    id = Column(Integer, primary_key=True)
    label = Column(String(20), unique=True, nullable=False)
    type_id = Column(Integer, ForeignKey('vehicle_types.id'), nullable=False)
    is_occupied = Column(Boolean, default=False)
    booking = Column(Boolean, default=False)  # True if spot is reserved for mobile booking
    vehicle_type = relationship('VehicleType')

class Vehicle(Base):
    __tablename__ = 'vehicles'
    id = Column(Integer, primary_key=True)
    plate_number = Column(String(20), unique=True, nullable=False)
    type_id = Column(Integer, ForeignKey('vehicle_types.id'), nullable=False)
    vehicle_type = relationship('VehicleType')

class RFIDAccount(Base):
    __tablename__ = 'rfid_accounts'
    id = Column(Integer, primary_key=True)
    rfid_number = Column(String(64), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    contact_number = Column(String(20), nullable=False)
    email = Column(String(100), nullable=False)
    national_id = Column(String(50), nullable=False)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_to = Column(DateTime(timezone=True), nullable=False)
    monthly_payment = Column(Numeric(10,2), nullable=False)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    vehicles = relationship('RFIDVehicle', back_populates='account')

class RFIDVehicle(Base):
    __tablename__ = 'rfid_vehicles'
    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey('rfid_accounts.id'), nullable=False)
    vehicle_id = Column(Integer, ForeignKey('vehicles.id'), nullable=False)
    is_active = Column(Boolean, default=True)
    added_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    account = relationship('RFIDAccount', back_populates='vehicles')
    vehicle = relationship('Vehicle')

class FeeSchedule(Base):
    __tablename__ = 'fee_schedules'
    id = Column(Integer, primary_key=True)
    type_id = Column(Integer, ForeignKey('vehicle_types.id'), nullable=False)
    band_name = Column(String(30), nullable=False)  # e.g., 0-30m, 30m-1h, 1-2h, ...
    amount_lkr = Column(Numeric(10,2), nullable=False)
    is_free_band = Column(Boolean, default=False)
    vehicle_type = relationship('VehicleType')

class ParkingSession(Base):
    __tablename__ = 'parking_sessions'
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey('vehicles.id'), nullable=False)
    spot_id = Column(Integer, ForeignKey('parking_spots.id'), nullable=False)
    entry_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    exit_time = Column(DateTime(timezone=True), nullable=True)
    entry_source = Column(String(20))
    exit_source = Column(String(20))
    qr_token = Column(String(64), unique=True)
    status = Column(String(20), default='active')
    calculated_fee_lkr = Column(Numeric(10,2))
    payment_method = Column(String(20))
    payment_status = Column(String(20))
    vehicle = relationship('Vehicle')
    spot = relationship('ParkingSpot')

class Payment(Base):
    __tablename__ = 'payments'
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('parking_sessions.id'), nullable=False)
    method = Column(String(20), nullable=False)  # cash | rfid
    amount_lkr = Column(Numeric(10,2), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    cashier_id = Column(Integer, ForeignKey('users.id'))

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey('users.id'))
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    details = Column(String(255))

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
    
    id = Column(String(50), primary_key=True)
    user_id = Column(Integer, ForeignKey('mobile_users.id'), nullable=False)
    vehicle_id = Column(Integer, ForeignKey('vehicles.id'), nullable=False)
    spot_id = Column(Integer, ForeignKey('parking_spots.id'), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_checked_in = Column(Boolean, default=False)
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    is_cancelled = Column(Boolean, default=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(String(50), nullable=True)
    qr_code_data = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship('MobileUser', back_populates='bookings')
    vehicle = relationship('Vehicle')
    spot = relationship('ParkingSpot')
