"""
Camera and Gate Control Router
Handles camera capture, vehicle detection, and gate control operations
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict
import base64
from datetime import datetime

from ..db.database import get_db
from ..routers.admin import get_current_role
from ..services.plate_recognition import (
    process_vehicle_image, 
    get_next_available_spot
)

router = APIRouter()

# Gate status storage (in production, use Redis or database)
gate_status = {
    'entry_gate': {'open': False, 'last_updated': None},
    'exit_gate': {'open': False, 'last_updated': None}
}

# Camera settings storage (in production, use database)
camera_settings = {
    'camera1_device': '0',  # Default to device 0
    'camera2_device': '1'   # Default to device 1
}

# Recently detected plates cache (prevents duplicate detections within 30 seconds)
# Format: {plate_number: last_detection_timestamp}
recently_detected_plates = {}

def is_recently_detected(plate: str, cooldown_seconds: int = 30) -> bool:
    """Check if plate was recently detected (within cooldown period)"""
    if plate in recently_detected_plates:
        time_diff = (datetime.utcnow() - recently_detected_plates[plate]).total_seconds()
        if time_diff < cooldown_seconds:
            print(f"[Cache] Plate {plate} was detected {time_diff:.1f}s ago, ignoring duplicate")
            return True
    return False

def mark_plate_detected(plate: str):
    """Mark plate as recently detected"""
    recently_detected_plates[plate] = datetime.utcnow()
    print(f"[Cache] Marked {plate} as detected at {datetime.utcnow()}")

@router.post("/camera1/capture")
async def capture_camera1(
    file: UploadFile = File(...),
    role: str = Depends(get_current_role),
    db: Session = Depends(get_db)
):
    """
    Camera 1 (Entry): Capture vehicle image and extract plate + type
    Auto-detects plate number, vehicle type, and finds available spot
    """
    try:
        print(f"[Camera1] Request received - role: {role}")
        print(f"[Camera1] File info: filename={file.filename}, content_type={file.content_type}")
    except Exception as e:
        print(f"[Camera1] ERROR reading file info: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid file upload: {str(e)}")
    
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Controller access required')
    
    try:
        # Read image data
        image_data = await file.read()
        print(f"[Camera1] Received image: {len(image_data)} bytes")
        
        if len(image_data) == 0:
            print("[Camera1] ERROR: Received empty image data")
            raise HTTPException(status_code=400, detail="Empty image data received")
        
        # Process image to extract plate and type
        try:
            result = process_vehicle_image(image_data)
            print(f"[Camera1] OCR Result: plate={result.get('plate')}, type={result.get('type_code')}, error={result.get('error')}")
        except Exception as ocr_err:
            print(f"[Camera1] OCR Processing Exception: {str(ocr_err)}")
            import traceback
            traceback.print_exc()
            # Return fallback response instead of crashing
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            return {
                'plate': 'UNKNOWN',
                'type_code': 'CAR',
                'spot_label': '',
                'image': f"data:image/jpeg;base64,{image_base64}",
                'timestamp': datetime.utcnow().isoformat(),
                'error': f'OCR processing failed: {str(ocr_err)}'
            }
        
        # If no plate detected, return UNKNOWN
        if not result['plate'] or result['plate'] == 'UNKNOWN':
            print("[Camera1] No valid license plate detected")
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            return {
                'plate': 'UNKNOWN',
                'type_code': 'CAR',
                'spot_label': '',
                'image': f"data:image/jpeg;base64,{image_base64}",
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Check if this plate was recently detected (prevent duplicates)
        if is_recently_detected(result['plate']):
            print(f"[Camera1] Duplicate detection ignored: {result['plate']}")
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            return {
                'plate': 'DUPLICATE',
                'type_code': result['type_code'],
                'spot_label': '',
                'image': f"data:image/jpeg;base64,{image_base64}",
                'timestamp': datetime.utcnow().isoformat(),
                'message': 'This vehicle was recently detected. Please wait before detecting again.'
            }
        
        # Mark this plate as detected
        mark_plate_detected(result['plate'])
        
        # Find next available spot for this vehicle type
        spot_label = get_next_available_spot(db, result['type_code'])
        print(f"[Camera1] Found spot: {spot_label}")
        
        if not spot_label:
            print(f"[Camera1] No available spots for {result['type_code']}")
            raise HTTPException(
                status_code=404, 
                detail=f"No available spots for vehicle type {result['type_code']}"
            )
        
        # Convert image to base64 for frontend display
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        response = {
            'plate': result['plate'],
            'type_code': result['type_code'],
            'spot_label': spot_label,
            'image': f"data:image/jpeg;base64,{image_base64}",
            'timestamp': datetime.utcnow().isoformat()
        }
        print(f"[Camera1] Success: {response['plate']} -> {response['spot_label']}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[Camera1] Unexpected Exception: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Camera capture failed: {str(e)}")

@router.post("/camera2/capture")
async def capture_camera2(
    file: UploadFile = File(...),
    role: str = Depends(get_current_role),
    db: Session = Depends(get_db)
):
    """
    Camera 2 (Exit): Capture vehicle image and extract plate
    Only extracts plate number for exit processing
    """
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Controller access required')
    
    try:
        # Read image data
        image_data = await file.read()
        print(f"[Camera2] Received image: {len(image_data)} bytes")
        
        # Process image to extract plate
        result = process_vehicle_image(image_data)
        print(f"[Camera2] OCR Result: plate={result.get('plate')}")
        
        # If no plate detected, return UNKNOWN
        if not result['plate'] or result['plate'] == 'UNKNOWN':
            print("[Camera2] No valid license plate detected")
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            return {
                'plate': 'UNKNOWN',
                'image': f"data:image/jpeg;base64,{image_base64}",
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Check if this plate was recently detected (prevent duplicates)
        if is_recently_detected(result['plate'], cooldown_seconds=15):  # Shorter cooldown for exit
            print(f"[Camera2] Duplicate detection ignored: {result['plate']}")
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            return {
                'plate': 'DUPLICATE',
                'image': f"data:image/jpeg;base64,{image_base64}",
                'timestamp': datetime.utcnow().isoformat(),
                'message': 'This vehicle was recently detected. Please wait before detecting again.'
            }
        
        # Mark this plate as detected
        mark_plate_detected(result['plate'])
        
        # Convert image to base64 for frontend display
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        print(f"[Camera2] Success: {result['plate']}")
        return {
            'plate': result['plate'],
            'image': f"data:image/jpeg;base64,{image_base64}",
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Camera capture failed: {str(e)}")

@router.post("/gates/entry/open")
async def open_entry_gate(role: str = Depends(get_current_role)):
    """Open entry gate (green indicator)"""
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Controller access required')
    
    gate_status['entry_gate']['open'] = True
    gate_status['entry_gate']['last_updated'] = datetime.utcnow().isoformat()
    
    return {
        'gate': 'entry',
        'status': 'open',
        'color': 'green',
        'timestamp': gate_status['entry_gate']['last_updated']
    }

@router.post("/gates/entry/close")
async def close_entry_gate(role: str = Depends(get_current_role)):
    """Close entry gate (red indicator)"""
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Controller access required')
    
    gate_status['entry_gate']['open'] = False
    gate_status['entry_gate']['last_updated'] = datetime.utcnow().isoformat()
    
    return {
        'gate': 'entry',
        'status': 'closed',
        'color': 'red',
        'timestamp': gate_status['entry_gate']['last_updated']
    }

@router.post("/gates/exit/open")
async def open_exit_gate(role: str = Depends(get_current_role)):
    """Open exit gate (green indicator)"""
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Controller access required')
    
    gate_status['exit_gate']['open'] = True
    gate_status['exit_gate']['last_updated'] = datetime.utcnow().isoformat()
    
    return {
        'gate': 'exit',
        'status': 'open',
        'color': 'green',
        'timestamp': gate_status['exit_gate']['last_updated']
    }

@router.post("/gates/exit/close")
async def close_exit_gate(role: str = Depends(get_current_role)):
    """Close exit gate (red indicator)"""
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Controller access required')
    
    gate_status['exit_gate']['open'] = False
    gate_status['exit_gate']['last_updated'] = datetime.utcnow().isoformat()
    
    return {
        'gate': 'exit',
        'status': 'closed',
        'color': 'red',
        'timestamp': gate_status['exit_gate']['last_updated']
    }

@router.get("/gates/status")
async def get_gates_status(role: str = Depends(get_current_role)):
    """Get current status of both gates"""
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Controller access required')
    
    return {
        'entry_gate': {
            'open': gate_status['entry_gate']['open'],
            'status': 'open' if gate_status['entry_gate']['open'] else 'closed',
            'color': 'green' if gate_status['entry_gate']['open'] else 'red',
            'last_updated': gate_status['entry_gate']['last_updated']
        },
        'exit_gate': {
            'open': gate_status['exit_gate']['open'],
            'status': 'open' if gate_status['exit_gate']['open'] else 'closed',
            'color': 'green' if gate_status['exit_gate']['open'] else 'red',
            'last_updated': gate_status['exit_gate']['last_updated']
        }
    }

@router.get("/settings")
async def get_camera_settings(role: str = Depends(get_current_role)):
    """Get camera device settings"""
    if role not in ['Admin', 'Controller']:
        raise HTTPException(status_code=403, detail='Admin or Controller access required')
    
    return camera_settings

@router.post("/settings")
async def update_camera_settings(settings: dict, role: str = Depends(get_current_role)):
    """Update camera device settings (Admin only)"""
    if role != 'Admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    if 'camera1_device' in settings:
        camera_settings['camera1_device'] = str(settings['camera1_device'])
    
    if 'camera2_device' in settings:
        camera_settings['camera2_device'] = str(settings['camera2_device'])
    
    return {
        'message': 'Camera settings updated successfully',
        'settings': camera_settings
    }
