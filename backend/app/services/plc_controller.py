"""
PLC Controller Service
Handles communication with PLC system for gate control via Modbus TCP/IP
"""

import logging
from typing import Optional, Dict
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException
import time

logger = logging.getLogger(__name__)


class PLCController:
    """
    PLC Controller for gate operations using Modbus TCP/IP protocol
    
    Memory Map:
    - Coil 0: Gate1 Open Command
    - Coil 1: Gate2 Open Command
    - Coil 2: Gate1 Close Command
    - Coil 3: Gate2 Close Command
    - Input 10: Gate1 Fully Open Status
    - Input 11: Gate2 Fully Open Status
    - Input 12: Gate1 Fully Closed Status
    - Input 13: Gate2 Fully Closed Status
    - Input 14: Vehicle at Entry Sensor
    - Input 15: Vehicle at Exit Sensor
    - Holding 20: Entry Traffic Light (0=Red, 1=Green)
    - Holding 21: Exit Traffic Light (0=Red, 1=Green)
    """
    
    def __init__(self, host: str = "192.168.1.110", port: int = 502, unit_id: int = 1):
        """
        Initialize PLC connection
        
        Args:
            host: PLC IP address
            port: Modbus TCP port (default 502)
            unit_id: Modbus unit/slave ID (default 1)
        """
        self.host = host
        self.port = port
        self.unit_id = unit_id
        self.client: Optional[ModbusTcpClient] = None
        self.connected = False
        
        # PLC Memory Addresses
        self.GATE1_OPEN_COIL = 0
        self.GATE2_OPEN_COIL = 1
        self.GATE1_CLOSE_COIL = 2
        self.GATE2_CLOSE_COIL = 3
        
        self.GATE1_OPEN_STATUS = 10
        self.GATE2_OPEN_STATUS = 11
        self.GATE1_CLOSED_STATUS = 12
        self.GATE2_CLOSED_STATUS = 13
        
        self.VEHICLE_AT_ENTRY = 14
        self.VEHICLE_AT_EXIT = 15
        
        self.ENTRY_TRAFFIC_LIGHT = 20
        self.EXIT_TRAFFIC_LIGHT = 21
    
    def connect(self) -> bool:
        """
        Connect to PLC
        
        Returns:
            bool: True if connection successful
        """
        try:
            self.client = ModbusTcpClient(
                host=self.host,
                port=self.port,
                timeout=3,
                retries=3,
                retry_on_empty=True
            )
            self.connected = self.client.connect()
            
            if self.connected:
                logger.info(f"[PLC] Connected to PLC at {self.host}:{self.port}")
            else:
                logger.error(f"[PLC] Failed to connect to PLC at {self.host}:{self.port}")
            
            return self.connected
        except Exception as e:
            logger.error(f"[PLC] Connection error: {str(e)}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Disconnect from PLC"""
        if self.client:
            self.client.close()
            self.connected = False
            logger.info("[PLC] Disconnected from PLC")
    
    def _ensure_connected(self) -> bool:
        """Ensure PLC connection is active"""
        if not self.connected:
            return self.connect()
        return True
    
    # Gate Control Methods
    
    def open_gate1(self) -> bool:
        """
        Open entry gate (Gate 1)
        
        Returns:
            bool: True if command sent successfully
        """
        try:
            if not self._ensure_connected():
                return False
            
            logger.info("[PLC] Opening Gate 1 (Entry)")
            
            # Set open coil to True
            result = self.client.write_coil(self.GATE1_OPEN_COIL, True, self.unit_id)
            
            if result.isError():
                logger.error(f"[PLC] Failed to open Gate 1: {result}")
                return False
            
            # Set traffic light to green
            self.set_entry_light_green()
            
            logger.info("[PLC] Gate 1 open command sent")
            return True
            
        except Exception as e:
            logger.error(f"[PLC] Error opening Gate 1: {str(e)}")
            return False
    
    def close_gate1(self) -> bool:
        """
        Close entry gate (Gate 1)
        
        Returns:
            bool: True if command sent successfully
        """
        try:
            if not self._ensure_connected():
                return False
            
            logger.info("[PLC] Closing Gate 1 (Entry)")
            
            # Set close coil to True
            result = self.client.write_coil(self.GATE1_CLOSE_COIL, True, self.unit_id)
            
            if result.isError():
                logger.error(f"[PLC] Failed to close Gate 1: {result}")
                return False
            
            # Set traffic light to red
            self.set_entry_light_red()
            
            logger.info("[PLC] Gate 1 close command sent")
            return True
            
        except Exception as e:
            logger.error(f"[PLC] Error closing Gate 1: {str(e)}")
            return False
    
    def open_gate2(self) -> bool:
        """
        Open exit gate (Gate 2)
        
        Returns:
            bool: True if command sent successfully
        """
        try:
            if not self._ensure_connected():
                return False
            
            logger.info("[PLC] Opening Gate 2 (Exit)")
            
            # Set open coil to True
            result = self.client.write_coil(self.GATE2_OPEN_COIL, True, self.unit_id)
            
            if result.isError():
                logger.error(f"[PLC] Failed to open Gate 2: {result}")
                return False
            
            # Set traffic light to green
            self.set_exit_light_green()
            
            logger.info("[PLC] Gate 2 open command sent")
            return True
            
        except Exception as e:
            logger.error(f"[PLC] Error opening Gate 2: {str(e)}")
            return False
    
    def close_gate2(self) -> bool:
        """
        Close exit gate (Gate 2)
        
        Returns:
            bool: True if command sent successfully
        """
        try:
            if not self._ensure_connected():
                return False
            
            logger.info("[PLC] Closing Gate 2 (Exit)")
            
            # Set close coil to True
            result = self.client.write_coil(self.GATE2_CLOSE_COIL, True, self.unit_id)
            
            if result.isError():
                logger.error(f"[PLC] Failed to close Gate 2: {result}")
                return False
            
            # Set traffic light to red
            self.set_exit_light_red()
            
            logger.info("[PLC] Gate 2 close command sent")
            return True
            
        except Exception as e:
            logger.error(f"[PLC] Error closing Gate 2: {str(e)}")
            return False
    
    # Status Check Methods
    
    def is_gate1_fully_open(self) -> bool:
        """Check if Gate 1 is fully open"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.read_discrete_inputs(self.GATE1_OPEN_STATUS, 1, self.unit_id)
            
            if result.isError():
                logger.error(f"[PLC] Failed to read Gate 1 open status: {result}")
                return False
            
            return result.bits[0]
            
        except Exception as e:
            logger.error(f"[PLC] Error reading Gate 1 status: {str(e)}")
            return False
    
    def is_gate1_fully_closed(self) -> bool:
        """Check if Gate 1 is fully closed"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.read_discrete_inputs(self.GATE1_CLOSED_STATUS, 1, self.unit_id)
            
            if result.isError():
                logger.error(f"[PLC] Failed to read Gate 1 closed status: {result}")
                return False
            
            return result.bits[0]
            
        except Exception as e:
            logger.error(f"[PLC] Error reading Gate 1 status: {str(e)}")
            return False
    
    def is_gate2_fully_open(self) -> bool:
        """Check if Gate 2 is fully open"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.read_discrete_inputs(self.GATE2_OPEN_STATUS, 1, self.unit_id)
            
            if result.isError():
                logger.error(f"[PLC] Failed to read Gate 2 open status: {result}")
                return False
            
            return result.bits[0]
            
        except Exception as e:
            logger.error(f"[PLC] Error reading Gate 2 status: {str(e)}")
            return False
    
    def is_gate2_fully_closed(self) -> bool:
        """Check if Gate 2 is fully closed"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.read_discrete_inputs(self.GATE2_CLOSED_STATUS, 1, self.unit_id)
            
            if result.isError():
                logger.error(f"[PLC] Failed to read Gate 2 closed status: {result}")
                return False
            
            return result.bits[0]
            
        except Exception as e:
            logger.error(f"[PLC] Error reading Gate 2 status: {str(e)}")
            return False
    
    # Vehicle Detection Methods
    
    def is_vehicle_at_entry(self) -> bool:
        """Check if vehicle is detected at entry sensor"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.read_discrete_inputs(self.VEHICLE_AT_ENTRY, 1, self.unit_id)
            
            if result.isError():
                return False
            
            return result.bits[0]
            
        except Exception as e:
            logger.error(f"[PLC] Error reading entry sensor: {str(e)}")
            return False
    
    def is_vehicle_at_exit(self) -> bool:
        """Check if vehicle is detected at exit sensor"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.read_discrete_inputs(self.VEHICLE_AT_EXIT, 1, self.unit_id)
            
            if result.isError():
                return False
            
            return result.bits[0]
            
        except Exception as e:
            logger.error(f"[PLC] Error reading exit sensor: {str(e)}")
            return False
    
    # Traffic Light Control
    
    def set_entry_light_green(self) -> bool:
        """Set entry traffic light to green"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.write_register(self.ENTRY_TRAFFIC_LIGHT, 1, self.unit_id)
            return not result.isError()
            
        except Exception as e:
            logger.error(f"[PLC] Error setting entry light: {str(e)}")
            return False
    
    def set_entry_light_red(self) -> bool:
        """Set entry traffic light to red"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.write_register(self.ENTRY_TRAFFIC_LIGHT, 0, self.unit_id)
            return not result.isError()
            
        except Exception as e:
            logger.error(f"[PLC] Error setting entry light: {str(e)}")
            return False
    
    def set_exit_light_green(self) -> bool:
        """Set exit traffic light to green"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.write_register(self.EXIT_TRAFFIC_LIGHT, 1, self.unit_id)
            return not result.isError()
            
        except Exception as e:
            logger.error(f"[PLC] Error setting exit light: {str(e)}")
            return False
    
    def set_exit_light_red(self) -> bool:
        """Set exit traffic light to red"""
        try:
            if not self._ensure_connected():
                return False
            
            result = self.client.write_register(self.EXIT_TRAFFIC_LIGHT, 0, self.unit_id)
            return not result.isError()
            
        except Exception as e:
            logger.error(f"[PLC] Error setting exit light: {str(e)}")
            return False
    
    # High-level Gate Operations
    
    def wait_for_gate1_open(self, timeout: int = 15) -> bool:
        """
        Wait for Gate 1 to fully open
        
        Args:
            timeout: Maximum wait time in seconds
            
        Returns:
            bool: True if gate opened within timeout
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self.is_gate1_fully_open():
                logger.info("[PLC] Gate 1 fully opened")
                return True
            time.sleep(0.5)
        
        logger.warning("[PLC] Gate 1 open timeout")
        return False
    
    def wait_for_gate2_open(self, timeout: int = 15) -> bool:
        """
        Wait for Gate 2 to fully open
        
        Args:
            timeout: Maximum wait time in seconds
            
        Returns:
            bool: True if gate opened within timeout
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self.is_gate2_fully_open():
                logger.info("[PLC] Gate 2 fully opened")
                return True
            time.sleep(0.5)
        
        logger.warning("[PLC] Gate 2 open timeout")
        return False
    
    def get_system_status(self) -> Dict:
        """
        Get comprehensive system status
        
        Returns:
            dict: System status information
        """
        return {
            "plc_connected": self.connected,
            "gate1": {
                "fully_open": self.is_gate1_fully_open(),
                "fully_closed": self.is_gate1_fully_closed(),
            },
            "gate2": {
                "fully_open": self.is_gate2_fully_open(),
                "fully_closed": self.is_gate2_fully_closed(),
            },
            "sensors": {
                "vehicle_at_entry": self.is_vehicle_at_entry(),
                "vehicle_at_exit": self.is_vehicle_at_exit(),
            }
        }


# Global PLC controller instance
_plc_controller: Optional[PLCController] = None


def get_plc_controller() -> PLCController:
    """
    Get or create global PLC controller instance
    
    Returns:
        PLCController: Global PLC controller
    """
    global _plc_controller
    if _plc_controller is None:
        _plc_controller = PLCController()
        _plc_controller.connect()
    return _plc_controller
