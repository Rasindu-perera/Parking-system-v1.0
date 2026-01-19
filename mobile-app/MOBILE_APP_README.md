# Mobile App Setup Guide

## Prerequisites
- Node.js (v18 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development - macOS only)

## Installation

1. **Install Dependencies**
   ```bash
   cd mobile-app/ParkingApp
   npm install
   ```

2. **Configure Backend API URL**
   - Edit `src/utils/constants.js`
   - Change `API_URL` to your backend server IP:
   ```javascript
   export const API_URL = 'http://YOUR_SERVER_IP:8002';
   ```

## Running the App

### Android

1. **Start Metro Bundler**
   ```bash
   npm start
   ```

2. **Run on Android Device/Emulator** (in a new terminal)
   ```bash
   npm run android
   ```

### iOS (macOS only)

1. **Install CocoaPods**
   ```bash
   cd ios
   pod install
   cd ..
   ```

2. **Start Metro Bundler**
   ```bash
   npm start
   ```

3. **Run on iOS Simulator** (in a new terminal)
   ```bash
   npm run ios
   ```

## Features

### User Authentication
- Register with username, email, password, full name, and phone
- Login with username and password
- Persistent login using AsyncStorage

### Parking Booking
- View real-time parking availability by vehicle type
- Select vehicle type (Car, Van, Bus, Truck, Bike, Bicycle)
- Enter vehicle plate number
- Choose start time
- Automatic booking expiry after 15 minutes

### QR Code System
- Generate QR code for each booking
- Display countdown timer showing time remaining
- Auto-cancel booking if vehicle doesn't arrive within 15 minutes
- Check-in confirmation at entrance gate
- Manual booking cancellation

### Push Notifications
- Booking confirmation notification
- 5-minute reminder before expiry
- Auto-cancellation notification
- Check-in success notification
- Manual cancellation confirmation

### Dashboard
- View active bookings with expiry times
- Check real-time parking spot availability
- Quick access to booking creation
- Pull to refresh data

## Building for Production

### Android APK

1. **Generate Release Keystore** (first time only)
   ```bash
   cd android/app
   keytool -genkeypair -v -storetype PKCS12 -keystore parking-app-release.keystore -alias parking-app -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Signing** (add to `android/gradle.properties`)
   ```
   PARKING_UPLOAD_STORE_FILE=parking-app-release.keystore
   PARKING_UPLOAD_KEY_ALIAS=parking-app
   PARKING_UPLOAD_STORE_PASSWORD=your_password
   PARKING_UPLOAD_KEY_PASSWORD=your_password
   ```

3. **Build APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   
   APK will be located at:
   `android/app/build/outputs/apk/release/app-release.apk`

### iOS IPA (macOS only)

1. **Open Xcode**
   ```bash
   open ios/ParkingApp.xcworkspace
   ```

2. **Configure Signing**
   - Select project in Xcode
   - Go to "Signing & Capabilities"
   - Select your team and signing certificate

3. **Archive & Export**
   - Product → Archive
   - Distribute App → Ad Hoc or App Store

## Troubleshooting

### Android Build Errors
- Clean build: `cd android && ./gradlew clean`
- Rebuild: `./gradlew assembleDebug`

### Metro Bundler Issues
- Clear cache: `npm start -- --reset-cache`

### Push Notification Not Working
- Check AndroidManifest.xml permissions
- Verify notification service is initialized in App.tsx
- For iOS, ensure Info.plist has notification permissions

### Cannot Connect to Backend
- Verify backend server is running on port 8002
- Check API_URL in constants.js matches your server IP
- For Android emulator, use `http://10.0.2.2:8002` (localhost alias)
- For physical devices, ensure device and server are on same network

## Backend Requirements

The mobile app requires the following backend endpoints to be running:

- POST `/mobile/register` - User registration
- POST `/mobile/login` - User authentication
- GET `/mobile/availability` - Parking availability
- POST `/mobile/bookings` - Create booking
- POST `/mobile/bookings/{id}/checkin` - Check-in
- POST `/mobile/bookings/{id}/cancel` - Cancel booking
- GET `/mobile/bookings/active` - Get active bookings
- POST `/mobile/validate-qr` - Validate QR code

Make sure backend server at `backend/app/routers/mobile_api.py` is running before using the mobile app.

## Important Notes

1. **15-Minute Booking Validity**: All bookings expire after 15 minutes automatically
2. **No Payment Gateway**: This version does NOT include online payment
3. **No Maps**: This version does NOT include Google Maps integration
4. **Push Notifications**: Local notifications only (not Firebase Cloud Messaging)
5. **QR Code**: Used for entry gate validation and check-in confirmation

## Testing

### Test User Registration
```bash
# Use the Register screen in the app
Username: testuser
Email: test@example.com
Password: test123
Full Name: Test User
Phone: +1234567890
```

### Test Booking Flow
1. Login with registered user
2. Go to Dashboard
3. Click "Book Parking Spot"
4. Enter plate number (e.g., ABC-1234)
5. Select vehicle type (e.g., Car)
6. Choose start time (default: now)
7. Click "Create Booking"
8. View QR code and countdown timer
9. Booking auto-cancels after 15 minutes if not checked in

## File Structure
```
mobile-app/ParkingApp/
├── android/                 # Android native code
├── ios/                     # iOS native code
├── src/
│   ├── navigation/          # Navigation setup
│   │   └── AppNavigator.js
│   ├── screens/             # UI screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── BookingScreen.js
│   │   └── QRCodeScreen.js
│   ├── services/            # API services
│   │   ├── api.js           # Axios configuration
│   │   ├── auth.js          # Authentication
│   │   ├── parking.js       # Parking operations
│   │   └── notification.js  # Push notifications
│   └── utils/
│       └── constants.js     # Configuration
├── App.tsx                  # Root component
├── index.js                 # App entry point
└── package.json             # Dependencies
```
