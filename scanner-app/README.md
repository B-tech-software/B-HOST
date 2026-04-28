# B-raise Gate Scanner App

Mobile-friendly QR code scanner for verifying event tickets at gates, with offline support.

## Features

- **QR Code Scanning** — Real-time ticket verification
- **Offline Support** — Scan offline and sync when connection returns
- **Access Code Login** — Secure gate staff authentication
- **Event-Specific** — Only verify tickets for assigned event
- **Mobile Optimized** — Works on phones and tablets
- **Service Worker** — PWA for offline-first experience

## Setup

### Prerequisites
- Node.js 16+
- Main B-raise backend running on `http://localhost:5000`

### Installation

```bash
cd scanner-app
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5175`

### Production Build

```bash
npm run build
npm run preview
```

## How It Works

### 1. Gate Staff Login
- Gate staff receives an access code when event is created
- They enter it on the login screen
- System downloads valid tickets for that event locally

### 2. Online Verification
- Scan QR code from ticket
- Backend verifies ticket is valid for that event
- Shows ✅ if valid, ❌ if already used or invalid
- Sync happens in real-time

### 3. Offline Verification
- If internet is unavailable, scanning still works
- Tickets are verified against locally cached data
- Verifications are queued for sync
- When connection returns, all scans are synced to backend

### 4. Sync & Accuracy
- Offline scans create a local queue
- When online, queue is sent to backend
- Backend validates each scan (prevents duplicates)
- Last scan wins in case of conflicts

## File Structure

```
scanner-app/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx      # Access code login
│   │   ├── ScannerPage.jsx    # Main QR scanner
│   ├── components/
│   │   └── SyncStatus.jsx     # Sync indicator
│   ├── utils/
│   │   ├── api.js             # API calls
│   │   └── offlineSync.js     # Offline queue & cache
│   ├── App.jsx                # Main app
│   └── main.jsx               # Entry point
├── public/
│   └── sw.js                  # Service Worker
├── package.json
└── vite.config.js
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
VITE_API_URL=http://localhost:5000
```

## Backend Integration

The scanner app calls these endpoints:

- `POST /api/organizers/scanner-codes/redeem` — Verify access code & get tickets
- `POST /api/tickets/verify` — Real-time ticket verification
- `POST /api/tickets/verify-batch` — Sync offline verifications

See [backend routes/organizers.py](../backend-flask/routes/organizers.py) and [routes/tickets.py](../backend-flask/routes/tickets.py) for details.

## Offline Behavior

The app uses:
- **localStorage** — Stores access code session, cached tickets, sync queue
- **Service Worker** — Caches app assets for offline availability
- **IndexedDB** — (Optional) For larger ticket caches

When offline:
1. Gate staff can still scan QR codes
2. Tickets are verified against cached data
3. Each scan is added to a sync queue
4. When online, the queue is uploaded to backend
5. Backend marks tickets as verified with proper timestamps

## Security Notes

- Access codes are temporary and can expire
- Each scanner session is bound to a specific event
- Tickets are marked as `usedAt` to prevent double-counting
- Service Worker caches assets only, not sensitive data

## Troubleshooting

### Camera not working
- Check browser permissions (Settings → Privacy → Camera)
- Use HTTPS in production (camera requires secure context)

### Offline mode not working
- Check browser localStorage is enabled
- Service Worker may not be registered (check DevTools → Application)

### Sync not working
- Check backend is running
- Verify `VITE_API_URL` environment variable is correct
- Check browser network tab for API errors

## Contributing

To extend the scanner app:
- Add new verification rules in `/src/utils/offlineSync.js`
- Improve UI in `/src/pages/ScannerPage.jsx`
- Add more API integrations in `/src/utils/api.js`
