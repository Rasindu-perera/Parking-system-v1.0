# Hardware Integration Guide - Parking System
## 2 Cameras + 2 Gates + PLC System

## Overview
This guide explains how to integrate:
- **Camera 1**: Entry Gate Camera (License Plate Recognition)
- **Camera 2**: Exit Gate Camera (License Plate Recognition)
- **Gate 1**: Entry Barrier (PLC Controlled)
- **Gate 2**: Exit Barrier (PLC Controlled)
- **PLC System**: Controls gate motors, sensors, and traffic lights

---

## Hardware Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PARKING SYSTEM                            │
│                                                              │
│  ┌──────────────┐                      ┌──────────────┐    │
│  │  Camera 1    │                      │  Camera 2    │    │
│  │  (Entry)     │                      │  (Exit)      │    │
│  │  IP: x.x.x.1 │                      │  IP: x.x.x.2 │    │
│  └──────┬───────┘                      └──────┬───────┘    │
│         │                                     │             │
│         │         Network Switch              │             │
│         └─────────────┬─────────────┬─────────┘             │
│                       │             │                       │
│                  ┌────┴─────────────┴────┐                 │
│                  │   Application Server   │                 │
│                  │   (FastAPI Backend)    │                 │
│                  │   Port: 8002           │                 │
│                  └────┬─────────────┬─────┘                 │
│                       │             │                       │
│         ┌─────────────┘             └─────────────┐         │
│         │                                         │         │
│  ┌──────┴────────┐                       ┌────────┴──────┐ │
│  │  PLC System   │                       │   Database    │ │
│  │  (Modbus TCP) │                       │   (MySQL)     │ │
│  │  IP: x.x.x.10 │                       │               │ │
│  └───┬───────┬───┘                       └───────────────┘ │
│      │       │                                              │
│  ┌───┴───┐ ┌─┴──────┐                                      │
│  │ Gate1 │ │ Gate2  │                                      │
│  │(Entry)│ │(Exit)  │                                      │
│  └───────┘ └────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Camera Setup

### Camera 1 (Entry Gate)
- **Model**: IP Camera with RTSP support
- **Resolution**: Minimum 1920x1080 (Full HD)
- **Position**: 3-5 meters before entry gate, 30-45° angle
- **Height**: 2-3 meters from ground
- **RTSP URL Format**: `rtsp://username:password@192.168.1.101:554/stream`

### Camera 2 (Exit Gate)
- **Model**: IP Camera with RTSP support
- **Resolution**: Minimum 1920x1080 (Full HD)
- **Position**: 3-5 meters before exit gate, 30-45° angle
- **Height**: 2-3 meters from ground
- **RTSP URL Format**: `rtsp://username:password@192.168.1.102:554/stream`

### Recommended Camera Specifications:
- IR Night Vision (for 24/7 operation)
- Wide Dynamic Range (WDR)
- PoE (Power over Ethernet) support
- H.264/H.265 encoding
- Weatherproof (IP66 or higher for outdoor)

### Camera Configuration in System:
```json
{
  "camera1": {
    "name": "Entry Gate Camera",
    "rtsp_url": "rtsp://admin:password@192.168.1.101:554/stream",
    "type": "entry",
    "enabled": true
  },
  "camera2": {
    "name": "Exit Gate Camera",
    "rtsp_url": "rtsp://admin:password@192.168.1.102:554/stream",
    "type": "exit",
    "enabled": true
  }
}
```

---

## 2. PLC System Integration

### Supported PLC Protocols:
1. **Modbus TCP/IP** (Most Common)
2. **Modbus RTU** (Serial RS-485)
3. **OPC UA** (Industrial Standard)
4. **HTTP REST API** (Modern PLCs)

### PLC Configuration Example (Modbus TCP):

#### PLC Memory Map:
| Address | Type  | Description           | Values        |
|---------|-------|-----------------------|---------------|
| 0       | Coil  | Gate1 Open Command    | 0=Close, 1=Open |
| 1       | Coil  | Gate2 Open Command    | 0=Close, 1=Open |
| 2       | Coil  | Gate1 Close Command   | 0=Off, 1=Close |
| 3       | Coil  | Gate2 Close Command   | 0=Off, 1=Close |
| 10      | Input | Gate1 Fully Open      | 0=No, 1=Yes   |
| 11      | Input | Gate2 Fully Open      | 0=No, 1=Yes   |
| 12      | Input | Gate1 Fully Closed    | 0=No, 1=Yes   |
| 13      | Input | Gate2 Fully Closed    | 0=No, 1=Yes   |
| 14      | Input | Vehicle at Entry      | 0=No, 1=Yes   |
| 15      | Input | Vehicle at Exit       | 0=No, 1=Yes   |
| 20      | Holding | Entry Traffic Light | 0=Red, 1=Green |
| 21      | Holding | Exit Traffic Light  | 0=Red, 1=Green |

### PLC Wiring:
```
Entry Gate System:
- Motor Power: 220V AC (from PLC relay output)
- Limit Switch (Fully Open): PLC Digital Input 1
- Limit Switch (Fully Closed): PLC Digital Input 2
- Inductive Sensor (Vehicle Detect): PLC Digital Input 3
- Traffic Light Red: PLC Digital Output 1
- Traffic Light Green: PLC Digital Output 2

Exit Gate System:
- Motor Power: 220V AC (from PLC relay output)
- Limit Switch (Fully Open): PLC Digital Input 4
- Limit Switch (Fully Closed): PLC Digital Input 5
- Inductive Sensor (Vehicle Detect): PLC Digital Input 6
- Traffic Light Red: PLC Digital Output 3
- Traffic Light Green: PLC Digital Output 4
```

---

## 3. Network Configuration

### IP Address Scheme:
```
Network: 192.168.1.0/24
Gateway: 192.168.1.1

Devices:
- Application Server: 192.168.1.100
- Camera 1 (Entry):   192.168.1.101
- Camera 2 (Exit):    192.168.1.102
- PLC Controller:     192.168.1.110
- Database Server:    192.168.1.120 (or localhost)
- Admin PC:           192.168.1.150
- Controller PC 1:    192.168.1.151
- Controller PC 2:    192.168.1.152
```

### Firewall Rules:
- Allow TCP port 554 (RTSP for cameras)
- Allow TCP port 502 (Modbus TCP for PLC)
- Allow TCP port 8002 (FastAPI application)
- Allow TCP port 3306 (MySQL database)

---

## 4. Software Components

### Backend Services:
1. **Camera Service** (`app/services/camera.py`)
   - Captures images from RTSP streams
   - Processes license plates using EasyOCR
   - Detects vehicle types

2. **PLC Service** (`app/services/plc_controller.py`) - NEW
   - Modbus TCP/IP communication
   - Gate control (open/close)
   - Traffic light control
   - Sensor monitoring

3. **Gate Manager** (`app/services/gate_manager.py`) - NEW
   - Entry/Exit workflow automation
   - Safety checks
   - Error handling

---

## 5. Installation Steps

### Step 1: Install PLC Communication Library
```bash
pip install pymodbus
pip install pymodbus[serial]  # If using RS-485
```

### Step 2: Configure PLC Settings
Edit `backend/config/plc_config.json`:
```json
{
  "plc": {
    "protocol": "modbus_tcp",
    "host": "192.168.1.110",
    "port": 502,
    "unit_id": 1,
    "timeout": 3,
    "retry_attempts": 3
  },
  "gates": {
    "entry": {
      "open_address": 0,
      "close_address": 2,
      "status_address": 10,
      "traffic_light_address": 20,
      "timeout_seconds": 10
    },
    "exit": {
      "open_address": 1,
      "close_address": 3,
      "status_address": 11,
      "traffic_light_address": 21,
      "timeout_seconds": 10
    }
  }
}
```

### Step 3: Update Camera Settings
Use Admin Dashboard → Camera Settings to configure:
- Camera 1 RTSP URL
- Camera 2 RTSP URL
- Enable/Disable cameras

### Step 4: Test Connections
```bash
# Test camera connection
python backend/scripts/test_camera.py

# Test PLC connection
python backend/scripts/test_plc.py

# Test gate operation
python backend/scripts/test_gate.py
```

---

## 6. Operation Workflow

### Entry Process:
1. Vehicle approaches entry gate
2. **Inductive sensor detects vehicle** → PLC sends signal
3. Camera 1 captures image
4. OCR processes license plate
5. System checks RFID/validates entry
6. **PLC opens Gate 1** (Traffic light: Red → Green)
7. Vehicle passes through
8. **PLC closes Gate 1** after vehicle clears
9. Session recorded in database

### Exit Process:
1. Vehicle approaches exit gate
2. **Inductive sensor detects vehicle** → PLC sends signal
3. Camera 2 captures image
4. OCR processes license plate
5. System calculates parking fee
6. Controller accepts payment
7. **PLC opens Gate 2** (Traffic light: Red → Green)
8. Vehicle passes through
9. **PLC closes Gate 2** after vehicle clears
10. Session closed in database

---

## 7. Safety Features

### Emergency Controls:
- Manual override buttons for each gate
- Emergency stop button (kills all motors)
- Power failure auto-open (battery backup)
- Obstacle detection sensors

### Software Safety:
- Gate timeout protection (auto-close after 15 seconds)
- Sensor validation before closing
- Error logging and alerts
- Heartbeat monitoring (PLC connection)

---

## 8. Troubleshooting

### Camera Issues:
```bash
# Test RTSP stream
ffplay rtsp://admin:password@192.168.1.101:554/stream

# Check camera ping
ping 192.168.1.101
```

### PLC Issues:
```bash
# Test Modbus connection
python -c "from pymodbus.client import ModbusTcpClient; client = ModbusTcpClient('192.168.1.110'); print(client.connect())"

# Check PLC ping
ping 192.168.1.110
```

### Gate Issues:
- Check limit switches (fully open/closed sensors)
- Verify motor power supply
- Check PLC output relays
- Test manual override

---

## 9. Recommended Hardware Vendors

### Cameras:
- Hikvision DS-2CD2T45 series
- Dahua IPC-HFW5831E-Z5E
- Axis P1448-LE
- Uniview IPC3232LR3-SPZ28-D

### PLC Controllers:
- Siemens S7-1200 series
- Allen-Bradley MicroLogix 1100
- Schneider Electric M221
- Mitsubishi FX5U series

### Barrier Gates:
- BFT Moovi 30/60
- FAAC 615/620
- Nice RB500/1000
- Automatic Systems Mistral 60

### Sensors:
- Inductive loop detectors
- Ultrasonic sensors (backup)
- IR beam sensors (safety)

---

## 10. Maintenance Schedule

### Daily:
- Check gate operation (morning/evening)
- Verify camera feed quality
- Review error logs

### Weekly:
- Test emergency stop
- Clean camera lenses
- Check gate alignment

### Monthly:
- Lubricate gate mechanisms
- Test backup power system
- Calibrate sensors
- Review PLC logs

### Annually:
- Full system inspection
- Replace worn components
- Update firmware/software
- Professional safety audit

---

## Support Contacts

For technical support:
- Camera issues: Check manufacturer manual
- PLC programming: Consult PLC vendor
- Software integration: Review API documentation
- Emergency: Use manual override controls

---

*Last Updated: December 6, 2025*
