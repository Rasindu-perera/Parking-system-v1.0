"""
PLC Connection Test Script
Tests connection to PLC and basic gate operations
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.plc_controller import PLCController
import time


def test_plc_connection():
    """Test PLC connection and basic operations"""
    
    print("=" * 60)
    print("PLC CONNECTION TEST")
    print("=" * 60)
    print()
    
    # Load config
    import json
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'plc_config.json')
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        plc_config = config['plc']
        
        if not plc_config.get('enabled', False):
            print("⚠️  WARNING: PLC is disabled in config")
            print("   Set 'enabled': true in backend/config/plc_config.json to enable")
            print()
            response = input("Continue anyway? (y/n): ")
            if response.lower() != 'y':
                print("Test cancelled")
                return
            print()
        
        print(f"PLC Configuration:")
        print(f"  Host: {plc_config['host']}")
        print(f"  Port: {plc_config['port']}")
        print(f"  Unit ID: {plc_config['unit_id']}")
        print()
        
    except FileNotFoundError:
        print("❌ Config file not found")
        print("   Using default values: 192.168.1.110:502")
        print()
        plc_config = {
            'host': '192.168.1.110',
            'port': 502,
            'unit_id': 1
        }
    
    # Initialize PLC
    print("Initializing PLC controller...")
    plc = PLCController(
        host=plc_config['host'],
        port=plc_config['port'],
        unit_id=plc_config['unit_id']
    )
    
    # Test connection
    print("Connecting to PLC...")
    if not plc.connect():
        print("❌ Failed to connect to PLC")
        print()
        print("Troubleshooting:")
        print("  1. Check PLC IP address is correct")
        print("  2. Verify PLC is powered on")
        print("  3. Test network connectivity: ping", plc_config['host'])
        print("  4. Check firewall allows port", plc_config['port'])
        print("  5. Verify Modbus TCP is enabled on PLC")
        return
    
    print("✅ Connected to PLC successfully")
    print()
    
    # Test system status
    print("-" * 60)
    print("SYSTEM STATUS CHECK")
    print("-" * 60)
    
    try:
        status = plc.get_system_status()
        
        print(f"PLC Connected: {'✅' if status['plc_connected'] else '❌'}")
        print()
        
        print("Gate 1 (Entry):")
        print(f"  Fully Open: {'✅' if status['gate1']['fully_open'] else '❌'}")
        print(f"  Fully Closed: {'✅' if status['gate1']['fully_closed'] else '❌'}")
        print()
        
        print("Gate 2 (Exit):")
        print(f"  Fully Open: {'✅' if status['gate2']['fully_open'] else '❌'}")
        print(f"  Fully Closed: {'✅' if status['gate2']['fully_closed'] else '❌'}")
        print()
        
        print("Vehicle Sensors:")
        print(f"  At Entry: {'🚗 YES' if status['sensors']['vehicle_at_entry'] else '❌ NO'}")
        print(f"  At Exit: {'🚗 YES' if status['sensors']['vehicle_at_exit'] else '❌ NO'}")
        print()
        
    except Exception as e:
        print(f"❌ Error reading status: {str(e)}")
        return
    
    # Test gate operations
    print("-" * 60)
    print("GATE OPERATION TEST")
    print("-" * 60)
    print()
    
    response = input("Test gate operations? (y/n): ")
    if response.lower() != 'y':
        print("Skipping gate test")
        plc.disconnect()
        return
    
    print()
    
    # Test Gate 1 (Entry)
    print("Testing Gate 1 (Entry)...")
    print("  Opening gate...")
    if plc.open_gate1():
        print("  ✅ Open command sent")
        print("  Waiting for gate to open...")
        if plc.wait_for_gate1_open(timeout=15):
            print("  ✅ Gate fully opened")
        else:
            print("  ⚠️  Gate did not reach fully open position")
        
        time.sleep(3)
        
        print("  Closing gate...")
        if plc.close_gate1():
            print("  ✅ Close command sent")
            time.sleep(5)
        else:
            print("  ❌ Close command failed")
    else:
        print("  ❌ Open command failed")
    
    print()
    
    # Test Gate 2 (Exit)
    print("Testing Gate 2 (Exit)...")
    print("  Opening gate...")
    if plc.open_gate2():
        print("  ✅ Open command sent")
        print("  Waiting for gate to open...")
        if plc.wait_for_gate2_open(timeout=15):
            print("  ✅ Gate fully opened")
        else:
            print("  ⚠️  Gate did not reach fully open position")
        
        time.sleep(3)
        
        print("  Closing gate...")
        if plc.close_gate2():
            print("  ✅ Close command sent")
            time.sleep(5)
        else:
            print("  ❌ Close command failed")
    else:
        print("  ❌ Open command failed")
    
    print()
    
    # Cleanup
    print("-" * 60)
    print("Disconnecting from PLC...")
    plc.disconnect()
    print("✅ Test completed")
    print()


if __name__ == "__main__":
    try:
        test_plc_connection()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
