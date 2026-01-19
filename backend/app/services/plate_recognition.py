"""
License Plate Recognition Service
Uses EasyOCR for actual license plate detection
Supports Sri Lankan plate formats: KN-1062, ABC-1234, WP-CAB-1234, etc.
"""
import re
from typing import Optional, Dict
import base64
from io import BytesIO
from PIL import Image
import numpy as np
import cv2

# Global EasyOCR reader (initialized on first use to avoid startup delay)
_reader = None

def get_ocr_reader():
    """Lazy load EasyOCR reader with optimized settings"""
    global _reader
    if _reader is None:
        try:
            import easyocr
            # Optimized: disable verbose for faster loading
            _reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        except Exception as e:
            print(f"Warning: Could not initialize EasyOCR: {e}")
            _reader = False
    return _reader

def preprocess_plate_image(image_data: bytes) -> np.ndarray:
    """
    Preprocess image for better OCR accuracy
    - Convert to grayscale
    - Apply adaptive thresholding
    - Denoise
    """
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply bilateral filter to reduce noise while keeping edges sharp
    denoised = cv2.bilateralFilter(gray, 11, 17, 17)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    return thresh

def extract_plate_from_image(image_data: bytes) -> Optional[str]:
    """
    Extract license plate number from vehicle image using EasyOCR.
    It tries multiple preprocessing methods and ranks the results to find the best plate.
    """
    reader = get_ocr_reader()
    if reader is False:
        print("OCR not available, using fallback")
        return None

    try:
        print("[OCR] Starting plate detection with multi-pass strategy...")
        
        preprocessing_methods = [
            ("High Contrast", lambda: cv2.convertScaleAbs(
                cv2.cvtColor(cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR), cv2.COLOR_BGR2GRAY),
                alpha=1.5, beta=30
            )),
            ("Adaptive Threshold", lambda: preprocess_plate_image(image_data)),
            ("Original Grayscale", lambda: cv2.cvtColor(
                cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR),
                cv2.COLOR_BGR2GRAY
            )),
        ]
        
        plate_candidates = []
        
        for method_name, preprocess_func in preprocessing_methods:
            try:
                processed_image = preprocess_func()
                # Optimized: add batch_size and text detection parameters for speed
                results = reader.readtext(
                    processed_image, 
                    detail=1, 
                    paragraph=False,
                    batch_size=1,
                    text_threshold=0.7,
                    low_text=0.4
                )
                
                if results:
                    detected_texts = [text[1].upper().strip() for text in results]
                    print(f"[OCR] Pass '{method_name}' detected texts: {detected_texts}")
                    
                    for text in detected_texts:
                        plate = extract_plate_pattern(text)
                        if plate and validate_plate_format(plate):
                            plate_candidates.append(plate)
                            # Optimized: if we found a valid plate, break early
                            if len(plate_candidates) >= 2:
                                print(f"[OCR] Early exit: found {len(plate_candidates)} candidates")
                                break
                            
            except Exception as e:
                print(f"[OCR] Preprocessing method '{method_name}' failed: {e}")
                continue
        
        if not plate_candidates:
            print("[OCR] ✗ No valid plate formats found in any pass.")
            return None

        # Score candidates: longer plates are generally better (e.g., WP-CAB-1234 > CAB-1234)
        # and more frequent candidates are more likely to be correct.
        print(f"[OCR] All valid candidates found: {plate_candidates}")
        
        # Use a frequency count to find the most reliable plate
        from collections import Counter
        candidate_counts = Counter(plate_candidates)
        
        # Sort by frequency, then by length (longer is better)
        sorted_candidates = sorted(candidate_counts.items(), key=lambda item: (item[1], len(item[0])), reverse=True)
        
        best_plate = sorted_candidates[0][0]
        print(f"[OCR] ✓ Best plate selected: {best_plate} (found {sorted_candidates[0][1]} times)")
        return best_plate
        
    except Exception as e:
        print(f"OCR Error: {e}")
        return None

def detect_vehicle_type_from_plate(plate: str) -> str:
    """
    Detect vehicle type from license plate prefix
    Based on Sri Lankan vehicle registration system:
    - Car (C): Prefix C (e.g., CAA, CBA) or old K, G, H, J
    - Bike (B): Prefix B (e.g., BAA, BAC) or old M, T, U, V, W, X
    - Three-Wheeler (A): Prefix A (e.g., AAA, ABC) or old Q, Y (mapped to BIKE type)
    - Dual Purpose/Cab (P): Prefix P (e.g., PAA, PBE) or old J, P (mapped to VAN type)
    - Bus (N): Prefix N (e.g., NA, NB) or old N (mapped to HEAVY type)
    - Lorry (L): Prefix L (e.g., LAA) or old L (mapped to HEAVY type)
    
    Database has: CAR, BIKE, HEAVY, VAN
    Mapping: Three-Wheeler->BIKE, Cab->VAN, Bus/Lorry->HEAVY
    """
    plate_upper = plate.upper()
    
    # Extract the main letter prefix
    # For format ABC-1234 or WP-ABC-1234
    parts = plate_upper.split('-')
    
    # Get the main letter part (last letter group before numbers)
    if len(parts) == 3:
        # Provincial format: WP-CAB-1234 -> use 'CAB'
        main_letters = parts[1]
    elif len(parts) == 2:
        # Standard format: ABC-1234 -> use 'ABC'
        main_letters = parts[0]
    else:
        return "CAR"  # Default fallback
    
    # Check first letter of main letters group
    first_letter = main_letters[0] if main_letters else ''
    
    # New system (first letter determines type)
    if first_letter == 'C':
        return "CAR"
    elif first_letter == 'B':
        return "BIKE"
    elif first_letter == 'A':
        return "BIKE"  # Three-Wheeler mapped to BIKE
    elif first_letter == 'P':
        return "VAN"   # Cab/Dual Purpose mapped to VAN
    elif first_letter == 'N':
        return "HEAVY"  # Bus
    elif first_letter == 'L':
        return "HEAVY"  # Lorry
    # Old system prefixes
    elif first_letter in ['K', 'G', 'H']:
        return "CAR"
    elif first_letter in ['M', 'T', 'U', 'V', 'W', 'X']:
        return "BIKE"
    elif first_letter in ['Q', 'Y']:
        return "BIKE"  # Three-Wheeler old prefix mapped to BIKE
    elif first_letter == 'J':
        # J can be either Car or Cab - default to CAR
        return "CAR"
    else:
        return "CAR"  # Default fallback

def detect_vehicle_type(image_data: bytes) -> Optional[str]:
    """
    Detect vehicle type from image
    For now: Returns 'CAR' by default
    This function is kept for backward compatibility
    TODO: Implement ML model for vehicle classification
    """
    # Basic heuristic: analyze image dimensions
    try:
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        height, width = image.shape[:2]
        aspect_ratio = width / height
        
        # Very basic classification (can be improved with ML model)
        if aspect_ratio > 2.0:
            return "BIKE"  # Bikes tend to be narrower
        elif aspect_ratio < 1.5:
            return "HEAVY"  # Trucks/buses are taller
        else:
            return "CAR"  # Most cars have moderate aspect ratio
            
    except Exception:
        return "CAR"

def extract_plate_pattern(text: str) -> Optional[str]:
    """
    Extract license plate pattern from OCR text
    Supports Sri Lankan formats:
    - Provincial plates: WP-CAB-1234, CP-ABC-5678
    - Old format: KN-1062, AB-1234, ABC-1234
    - New format: CAB-1234, ABC-5678
    """
    # Remove extra whitespace and convert to uppercase
    text = text.upper().strip()
    text = re.sub(r'\s+', ' ', text)  # Normalize spaces
    
    # Pattern matching for Sri Lankan license plate formats
    patterns = [
        # Provincial format: WP-CAB-1234, CP-ABC-5678 (2 letters, 3 letters, 4 digits)
        r'([A-Z]{2})[-\s]?([A-Z]{3})[-\s]?(\d{4})',
        
        # Standard format: ABC-1234, CAB-5678 (3 letters, 4 digits)
        r'([A-Z]{3})[-\s]?(\d{4})',
        
        # Old short format: KN-1062, AB-1234 (2 letters, 4 digits)
        r'([A-Z]{2})[-\s]?(\d{4})',
        
        # Without separator: WP CAB 1234, WPCAB1234
        r'([A-Z]{2})\s?([A-Z]{3})\s?(\d{4})',
        
        # Without separator: ABC1234, CAB5678
        r'([A-Z]{3})(\d{4})',
        
        # Without separator: KN1062, AB1234
        r'([A-Z]{2})(\d{4})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            groups = match.groups()
            
            # Format based on number of groups
            if len(groups) == 3:
                # Provincial format: WP-CAB-1234
                return f"{groups[0]}-{groups[1]}-{groups[2]}"
            elif len(groups) == 2:
                # Standard format: ABC-1234 or KN-1062
                return f"{groups[0]}-{groups[1]}"
    
    return None

def validate_plate_format(plate: str) -> bool:
    """
    Validate if plate matches Sri Lankan format
    Accepts: WP-CAB-1234, ABC-1234, KN-1062
    """
    patterns = [
        r'^[A-Z]{2}-[A-Z]{3}-\d{4}$',  # Provincial: WP-CAB-1234
        r'^[A-Z]{3}-\d{4}$',            # Standard: ABC-1234
        r'^[A-Z]{2}-\d{4}$'             # Old short: KN-1062
    ]
    
    plate_upper = plate.upper()
    return any(re.match(pattern, plate_upper) for pattern in patterns)

def get_next_available_spot(db, type_code: str) -> Optional[str]:
    """
    Find next available parking spot for given vehicle type
    Returns spot label or None if no spots available
    """
    from ..db.models import ParkingSpot, VehicleType
    
    # Get vehicle type
    vtype = db.query(VehicleType).filter(VehicleType.code == type_code).first()
    if not vtype:
        return None
    
    # Find first available spot for this type
    spot = db.query(ParkingSpot).filter(
        ParkingSpot.type_id == vtype.id,
        ParkingSpot.is_occupied == False
    ).first()
    
    return spot.label if spot else None

def process_vehicle_image(image_data: bytes) -> Dict[str, str]:
    """
    Complete pipeline: Extract plate, detect type from plate prefix, find spot
    Returns dict with plate, type_code, and error if any
    """
    result = {
        'plate': None,
        'type_code': None,
        'error': None
    }
    
    try:
        # Extract plate number
        plate = extract_plate_from_image(image_data)
        if not plate:
            result['error'] = "Could not detect license plate"
            return result
        
        if not validate_plate_format(plate):
            result['error'] = f"Invalid plate format: {plate}"
            return result
        
        result['plate'] = plate
        
        # Detect vehicle type from plate prefix (Sri Lankan system)
        type_code = detect_vehicle_type_from_plate(plate)
        if not type_code:
            result['error'] = "Could not detect vehicle type from plate"
            return result
        
        result['type_code'] = type_code
        print(f"[Type Detection] Plate {plate} -> Type {type_code}")
        
    except Exception as e:
        result['error'] = f"Image processing error: {str(e)}"
    
    return result
