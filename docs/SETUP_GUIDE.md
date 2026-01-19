# Hardware Integration Setup Guide

## Quick Start - Install Required Libraries

### 1. Install Python Dependencies

```bash
# Navigate to backend directory
cd "c:\Users\Rasindu Perera\Documents\VS project\Parking System\backend"

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install pymodbus for PLC communication
pip install pymodbus>=3.5.0

# Install opencv-python if not already installed
pip install opencv-python>=4.8.0
```
# Copy environment example
cd infra
copy .env.example .env

# Edit .env with your production values
notepad .env

# Build and run with Docker Compose
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

## 2. Configure Network

### Set Static IP Addresses:

**Application Server** (Your PC):
- IP: 192.168.1.100
- Subnet: 255.255.255.0
- Gateway: 192.168.1.1

**Camera 1 (Entry)**:
- IP: 192.168.1.101
- Username: admin
- Password: (your camera password)
- RTSP Port: 554

**Camera 2 (Exit)**:
- IP: 192.168.1.102
- Username: admin
- Password: (your camera password)
- RTSP Port: 554

**PLC Controller**:
- IP: 192.168.1.110
- Modbus TCP Port: 502
- Unit ID: 1

### Windows Network Configuration:
1. Open Control Panel → Network and Sharing Center
2. Click your network adapter → Properties
3. Select "Internet Protocol Version 4 (TCP/IPv4)" → Properties
4. Select "Use the following IP address"
5. Enter:
   - IP address: 192.168.1.100
   - Subnet mask: 255.255.255.0
   - Default gateway: 192.168.1.1
   - Preferred DNS: 8.8.8.8

## 3. Configure System

### Edit PLC Configuration:

```bash
# Edit file: backend/config/plc_config.json
notepad "backend\config\plc_config.json"
```

Update with your actual values:

```json
{
  "plc": {
    "host": "192.168.1.110",    // Your PLC IP
    "port": 502,                // Modbus TCP port
    "enabled": true             // Set to true when ready
  },
  "cameras": {
    "camera1": {
      "rtsp_url": "rtsp://admin:YOUR_PASSWORD@192.168.1.101:554/stream",
      "enabled": true
    },
    "camera2": {
      "rtsp_url": "rtsp://admin:YOUR_PASSWORD@192.168.1.102:554/stream",
      "enabled": true
    }
  }
}
```

## 4. Test Connections

### Test Camera Connection:

```bash
# Run camera test script
python backend\scripts\test_camera.py
```

Expected output:
```
✅ Connected to camera
✅ Frame captured successfully
Frame size: 1920x1080
```

### Test PLC Connection:

```bash
# Run PLC test script
python backend\scripts\test_plc.py
```

Expected output:
```
✅ Connected to PLC successfully
Gate 1 (Entry):
  Fully Open: ✅
  Fully Closed: ❌
```

## 5. Camera RTSP URL Formats

Different camera brands use different RTSP paths:

### Hikvision:
```
rtsp://admin:password@192.168.1.101:554/Streaming/Channels/101
```

### Dahua:
```
rtsp://admin:password@192.168.1.101:554/cam/realmonitor?channel=1&subtype=0
```

### Axis:
```
rtsp://admin:password@192.168.1.101:554/axis-media/media.amp
```

### Generic/Universal:
```
rtsp://admin:password@192.168.1.101:554/stream
rtsp://admin:password@192.168.1.101:554/stream1
```

**To find your camera's RTSP URL:**
1. Check camera manual
2. Use manufacturer's software
3. Try common paths listed above
4. Use VLC Media Player: Media → Open Network Stream → Test RTSP URL

## 6. PLC Programming

### Modbus Memory Map (Program in your PLC):

**Digital Outputs (Coils):**
- Address 0: Gate 1 Open Command
- Address 1: Gate 2 Open Command
- Address 2: Gate 1 Close Command
- Address 3: Gate 2 Close Command

**Digital Inputs:**
- Address 10: Gate 1 Fully Open Limit Switch
- Address 11: Gate 2 Fully Open Limit Switch
- Address 12: Gate 1 Fully Closed Limit Switch
- Address 13: Gate 2 Fully Closed Limit Switch
- Address 14: Vehicle at Entry Sensor
- Address 15: Vehicle at Exit Sensor

**Holding Registers:**
- Address 20: Entry Traffic Light (0=Red, 1=Green)
- Address 21: Exit Traffic Light (0=Red, 1=Green)

### Example PLC Ladder Logic (Simplified):

```
Gate 1 Open:
[Coil 0] --[Motor Forward]-- [Stop when Input 10 = ON]

Gate 1 Close:
[Coil 2] --[Motor Reverse]-- [Stop when Input 12 = ON]

Safety:
[Input 14 = ON] --[Do NOT close Gate 1]
```

## 7. Wiring Diagram

```
PLC Digital Outputs:
DO1 → Gate 1 Motor Relay (Forward)
DO2 → Gate 1 Motor Relay (Reverse)
DO3 → Gate 2 Motor Relay (Forward)
DO4 → Gate 2 Motor Relay (Reverse)
DO5 → Entry Traffic Light (Red)
DO6 → Entry Traffic Light (Green)
DO7 → Exit Traffic Light (Red)
DO8 → Exit Traffic Light (Green)

PLC Digital Inputs:
DI1 ← Gate 1 Limit Switch (Fully Open)
DI2 ← Gate 1 Limit Switch (Fully Closed)
DI3 ← Gate 2 Limit Switch (Fully Open)
DI4 ← Gate 2 Limit Switch (Fully Closed)
DI5 ← Entry Inductive Loop Sensor
DI6 ← Exit Inductive Loop Sensor

Power:
220V AC → Gate Motors
24V DC → PLC, Sensors, Lights
```

## 8. Troubleshooting

### Camera Issues:

**Cannot connect to camera:**
```bash
# Test ping
ping 192.168.1.101

# Test RTSP with VLC or ffplay
ffplay rtsp://admin:password@192.168.1.101:554/stream
```

**Poor image quality:**
- Clean camera lens
- Adjust camera angle (30-45° toward vehicle)
- Enable WDR (Wide Dynamic Range)
- Adjust exposure settings

### PLC Issues:

**Cannot connect to PLC:**
```bash
# Test ping
ping 192.168.1.110

# Check port is open
Test-NetConnection -ComputerName 192.168.1.110 -Port 502
```

**Gates not responding:**
- Check PLC program is running
- Verify Modbus addresses match
- Test manual gate operation
- Check limit switches

### Network Issues:

**Devices cannot communicate:**
- Verify all devices on same subnet (192.168.1.x)
- Check Windows Firewall settings
- Disable antivirus temporarily for testing
- Use network switch, not WiFi

## 9. Safety Checklist

Before going live:

- [ ] Emergency stop button installed and tested
- [ ] Manual override buttons functional
- [ ] Obstacle detection sensors working
- [ ] Gates auto-close after timeout
- [ ] Battery backup system tested
- [ ] All limit switches functioning
- [ ] Traffic lights visible from driver position
- [ ] Clear signage for entry/exit
- [ ] Security camera recording
- [ ] Backup power for gates (open on power failure)

## 10. Maintenance

### Daily:
- Test emergency stop
- Verify camera feeds
- Check gate operation

### Weekly:
- Clean camera lenses
- Test backup systems
- Review error logs

### Monthly:
- Lubricate gate mechanisms
- Test all sensors
- Calibrate OCR accuracy
- Update software if needed

## Support

For hardware issues:
- Camera: Manufacturer support
- PLC: PLC vendor/electrician
- Gates: Gate installer

For software issues:
- Check logs: backend/logs/
- Review documentation
- Test with scripts

---

**IMPORTANT SAFETY NOTICE:**

Only qualified electricians should:
- Wire high voltage (220V AC) systems
- Install gate motors and safety devices
- Configure PLC industrial controls

Improper installation can cause:
- Equipment damage
- Personal injury
- Fire hazard

Always follow local electrical codes and regulations.
