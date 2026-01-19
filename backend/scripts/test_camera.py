"""
Camera RTSP Test Script
Tests connection to IP cameras via RTSP
"""

import sys
import os
import cv2

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def test_camera_rtsp():
    """Test RTSP connection to cameras"""
    
    print("=" * 60)
    print("CAMERA RTSP CONNECTION TEST")
    print("=" * 60)
    print()
    
    # Load config
    import json
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'plc_config.json')
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        cameras = config['cameras']
        
    except FileNotFoundError:
        print("❌ Config file not found")
        print("   Please create backend/config/plc_config.json")
        return
    
    # Test each camera
    for camera_id, camera_config in cameras.items():
        print("-" * 60)
        print(f"Testing {camera_config['name']} ({camera_id})")
        print("-" * 60)
        
        if not camera_config.get('enabled', False):
            print("⚠️  Camera is disabled in config")
            print()
            continue
        
        rtsp_url = camera_config['rtsp_url']
        
        # Hide password in display
        display_url = rtsp_url
        if '@' in rtsp_url:
            parts = rtsp_url.split('@')
            protocol = parts[0].split('://')[0]
            display_url = f"{protocol}://****:****@{parts[1]}"
        
        print(f"RTSP URL: {display_url}")
        print(f"Resolution: {camera_config.get('resolution', 'N/A')}")
        print(f"Type: {camera_config.get('type', 'N/A')}")
        print()
        
        print("Connecting to camera...")
        
        try:
            # Try to open RTSP stream
            cap = cv2.VideoCapture(rtsp_url)
            
            if not cap.isOpened():
                print("❌ Failed to connect to camera")
                print()
                print("Troubleshooting:")
                print("  1. Check camera IP address is correct")
                print("  2. Verify camera is powered on")
                print("  3. Test network connectivity: ping <camera_ip>")
                print("  4. Check RTSP username/password")
                print("  5. Verify RTSP port (default 554)")
                print("  6. Check camera RTSP is enabled")
                print()
                continue
            
            print("✅ Connected to camera")
            
            # Try to read a frame
            print("Capturing frame...")
            ret, frame = cap.read()
            
            if not ret:
                print("❌ Failed to capture frame")
                print()
                continue
            
            print("✅ Frame captured successfully")
            
            # Get frame info
            height, width = frame.shape[:2]
            print(f"Frame size: {width}x{height}")
            
            # Get camera properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            print(f"FPS: {fps:.1f}")
            
            print()
            
            # Ask to save test image
            response = input("Save test image? (y/n): ")
            if response.lower() == 'y':
                output_path = f"test_{camera_id}.jpg"
                cv2.imwrite(output_path, frame)
                print(f"✅ Image saved as {output_path}")
            
            print()
            
            # Cleanup
            cap.release()
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            print()
            continue
    
    print("=" * 60)
    print("Camera test completed")
    print("=" * 60)


def test_camera_simple():
    """Simple camera test with manual URL input"""
    
    print("=" * 60)
    print("SIMPLE CAMERA TEST")
    print("=" * 60)
    print()
    
    print("Enter RTSP URL (or press Enter to skip):")
    print("Example: rtsp://admin:password@192.168.1.101:554/stream")
    rtsp_url = input("RTSP URL: ").strip()
    
    if not rtsp_url:
        print("No URL provided. Test cancelled.")
        return
    
    print()
    print("Connecting to camera...")
    
    try:
        cap = cv2.VideoCapture(rtsp_url)
        
        if not cap.isOpened():
            print("❌ Failed to connect")
            return
        
        print("✅ Connected")
        
        print("Capturing frame...")
        ret, frame = cap.read()
        
        if not ret:
            print("❌ Failed to capture frame")
            cap.release()
            return
        
        print("✅ Frame captured")
        
        height, width = frame.shape[:2]
        print(f"Frame size: {width}x{height}")
        
        cv2.imwrite("test_camera.jpg", frame)
        print("✅ Image saved as test_camera.jpg")
        
        cap.release()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


if __name__ == "__main__":
    print("Camera Test Options:")
    print("1. Test cameras from config file")
    print("2. Test single camera (manual URL)")
    print()
    
    choice = input("Choose option (1 or 2): ").strip()
    print()
    
    try:
        if choice == '1':
            test_camera_rtsp()
        elif choice == '2':
            test_camera_simple()
        else:
            print("Invalid option")
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
