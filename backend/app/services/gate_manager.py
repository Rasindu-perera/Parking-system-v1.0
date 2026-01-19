"""
Gate Manager Service
Orchestrates entry/exit workflows with camera and PLC integration
"""

import logging
from typing import Optional, Dict
from datetime import datetime
import asyncio

from .plc_controller import get_plc_controller
from .camera import capture_and_recognize
from .plate_recognition import detect_vehicle_type_from_plate

logger = logging.getLogger(__name__)


class GateManager:
    """
    Manages gate operations for entry and exit workflows
    Coordinates camera capture, OCR, and PLC gate control
    """
    
    def __init__(self):
        self.plc = get_plc_controller()
        self.entry_in_progress = False
        self.exit_in_progress = False
    
    async def process_entry(self, camera_name: str = "camera1") -> Dict:
        """
        Process vehicle entry workflow
        
        Steps:
        1. Detect vehicle at entry sensor
        2. Capture image from camera1
        3. Recognize license plate
        4. Detect vehicle type
        5. Open Gate 1
        6. Wait for vehicle to pass
        7. Close Gate 1
        
        Args:
            camera_name: Camera identifier (default: camera1)
            
        Returns:
            dict: Entry result with plate, type, and status
        """
        if self.entry_in_progress:
            return {
                "success": False,
                "error": "Entry already in progress"
            }
        
        self.entry_in_progress = True
        
        try:
            logger.info("[Gate Manager] Starting entry process")
            
            # Step 1: Check vehicle sensor
            if not self.plc.is_vehicle_at_entry():
                logger.info("[Gate Manager] Waiting for vehicle at entry...")
                # Wait up to 30 seconds for vehicle
                wait_count = 0
                while not self.plc.is_vehicle_at_entry() and wait_count < 60:
                    await asyncio.sleep(0.5)
                    wait_count += 1
                
                if not self.plc.is_vehicle_at_entry():
                    return {
                        "success": False,
                        "error": "No vehicle detected at entry"
                    }
            
            logger.info("[Gate Manager] Vehicle detected at entry")
            
            # Step 2 & 3: Capture and recognize plate
            logger.info(f"[Gate Manager] Capturing image from {camera_name}")
            ocr_result = capture_and_recognize(camera_name)
            
            if not ocr_result or not ocr_result.get("plate_number"):
                logger.warning("[Gate Manager] Failed to recognize plate")
                # Still open gate for manual processing
                plate_number = "MANUAL"
                vehicle_type = "CAR"
            else:
                plate_number = ocr_result["plate_number"]
                vehicle_type = ocr_result.get("type_code", "CAR")
            
            logger.info(f"[Gate Manager] Plate: {plate_number}, Type: {vehicle_type}")
            
            # Step 4: Detect vehicle type from plate
            detected_type = detect_vehicle_type_from_plate(plate_number)
            if detected_type:
                vehicle_type = detected_type
                logger.info(f"[Gate Manager] Auto-detected type: {vehicle_type}")
            
            # Step 5: Open Gate 1
            logger.info("[Gate Manager] Opening entry gate")
            if not self.plc.open_gate1():
                return {
                    "success": False,
                    "error": "Failed to open entry gate",
                    "plate_number": plate_number,
                    "type_code": vehicle_type
                }
            
            # Wait for gate to fully open
            if not self.plc.wait_for_gate1_open(timeout=15):
                logger.warning("[Gate Manager] Gate 1 did not fully open in time")
            
            # Step 6: Wait for vehicle to pass
            logger.info("[Gate Manager] Waiting for vehicle to pass...")
            await asyncio.sleep(5)  # Give vehicle time to pass
            
            # Wait until vehicle clears the sensor
            wait_count = 0
            while self.plc.is_vehicle_at_entry() and wait_count < 30:
                await asyncio.sleep(0.5)
                wait_count += 1
            
            # Step 7: Close Gate 1
            logger.info("[Gate Manager] Closing entry gate")
            self.plc.close_gate1()
            
            logger.info("[Gate Manager] Entry process completed successfully")
            
            return {
                "success": True,
                "plate_number": plate_number,
                "type_code": vehicle_type,
                "entry_time": datetime.now().isoformat(),
                "message": "Vehicle entry processed successfully"
            }
            
        except Exception as e:
            logger.error(f"[Gate Manager] Entry process error: {str(e)}")
            # Ensure gate is closed on error
            self.plc.close_gate1()
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            self.entry_in_progress = False
    
    async def process_exit(self, camera_name: str = "camera2") -> Dict:
        """
        Process vehicle exit workflow
        
        Steps:
        1. Detect vehicle at exit sensor
        2. Capture image from camera2
        3. Recognize license plate
        4. Calculate parking fee
        5. Wait for payment confirmation
        6. Open Gate 2
        7. Wait for vehicle to pass
        8. Close Gate 2
        
        Args:
            camera_name: Camera identifier (default: camera2)
            
        Returns:
            dict: Exit result with plate, fee, and status
        """
        if self.exit_in_progress:
            return {
                "success": False,
                "error": "Exit already in progress"
            }
        
        self.exit_in_progress = True
        
        try:
            logger.info("[Gate Manager] Starting exit process")
            
            # Step 1: Check vehicle sensor
            if not self.plc.is_vehicle_at_exit():
                logger.info("[Gate Manager] Waiting for vehicle at exit...")
                # Wait up to 30 seconds for vehicle
                wait_count = 0
                while not self.plc.is_vehicle_at_exit() and wait_count < 60:
                    await asyncio.sleep(0.5)
                    wait_count += 1
                
                if not self.plc.is_vehicle_at_exit():
                    return {
                        "success": False,
                        "error": "No vehicle detected at exit"
                    }
            
            logger.info("[Gate Manager] Vehicle detected at exit")
            
            # Step 2 & 3: Capture and recognize plate
            logger.info(f"[Gate Manager] Capturing image from {camera_name}")
            ocr_result = capture_and_recognize(camera_name)
            
            if not ocr_result or not ocr_result.get("plate_number"):
                logger.warning("[Gate Manager] Failed to recognize plate")
                plate_number = "MANUAL"
            else:
                plate_number = ocr_result["plate_number"]
            
            logger.info(f"[Gate Manager] Exit plate: {plate_number}")
            
            # Note: Fee calculation and payment handled by controller
            # This just handles the physical gate operation
            
            return {
                "success": True,
                "plate_number": plate_number,
                "message": "Ready for payment and gate opening"
            }
            
        except Exception as e:
            logger.error(f"[Gate Manager] Exit process error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            self.exit_in_progress = False
    
    async def open_exit_gate_after_payment(self) -> Dict:
        """
        Open exit gate after payment is confirmed
        
        Returns:
            dict: Gate operation result
        """
        try:
            logger.info("[Gate Manager] Opening exit gate after payment")
            
            # Open Gate 2
            if not self.plc.open_gate2():
                return {
                    "success": False,
                    "error": "Failed to open exit gate"
                }
            
            # Wait for gate to fully open
            if not self.plc.wait_for_gate2_open(timeout=15):
                logger.warning("[Gate Manager] Gate 2 did not fully open in time")
            
            # Wait for vehicle to pass
            logger.info("[Gate Manager] Waiting for vehicle to pass...")
            await asyncio.sleep(5)
            
            # Wait until vehicle clears the sensor
            wait_count = 0
            while self.plc.is_vehicle_at_exit() and wait_count < 30:
                await asyncio.sleep(0.5)
                wait_count += 1
            
            # Close Gate 2
            logger.info("[Gate Manager] Closing exit gate")
            self.plc.close_gate2()
            
            logger.info("[Gate Manager] Exit gate operation completed")
            
            return {
                "success": True,
                "message": "Exit gate operated successfully"
            }
            
        except Exception as e:
            logger.error(f"[Gate Manager] Exit gate operation error: {str(e)}")
            # Ensure gate is closed on error
            self.plc.close_gate2()
            return {
                "success": False,
                "error": str(e)
            }
    
    def emergency_open_all_gates(self) -> Dict:
        """
        Emergency: Open all gates (power failure, evacuation, etc.)
        
        Returns:
            dict: Operation result
        """
        logger.critical("[Gate Manager] EMERGENCY: Opening all gates")
        
        try:
            gate1_result = self.plc.open_gate1()
            gate2_result = self.plc.open_gate2()
            
            return {
                "success": gate1_result and gate2_result,
                "gate1_opened": gate1_result,
                "gate2_opened": gate2_result,
                "message": "Emergency gate opening executed"
            }
        except Exception as e:
            logger.error(f"[Gate Manager] Emergency open error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def emergency_close_all_gates(self) -> Dict:
        """
        Emergency: Close all gates (security threat, etc.)
        
        Returns:
            dict: Operation result
        """
        logger.critical("[Gate Manager] EMERGENCY: Closing all gates")
        
        try:
            gate1_result = self.plc.close_gate1()
            gate2_result = self.plc.close_gate2()
            
            return {
                "success": gate1_result and gate2_result,
                "gate1_closed": gate1_result,
                "gate2_closed": gate2_result,
                "message": "Emergency gate closing executed"
            }
        except Exception as e:
            logger.error(f"[Gate Manager] Emergency close error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_gate_status(self) -> Dict:
        """
        Get current status of all gates and sensors
        
        Returns:
            dict: Complete system status
        """
        return self.plc.get_system_status()


# Global gate manager instance
_gate_manager: Optional[GateManager] = None


def get_gate_manager() -> GateManager:
    """
    Get or create global gate manager instance
    
    Returns:
        GateManager: Global gate manager
    """
    global _gate_manager
    if _gate_manager is None:
        _gate_manager = GateManager()
    return _gate_manager
