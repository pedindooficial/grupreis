# HTTPS Setup for Local Development

This guide explains how to run both frontend and backend servers with HTTPS using self-signed certificates.

## ✅ What's Been Done

1. **Generated SSL Certificates** - Self-signed certificates for `localhost` are in the `certs/` directory
2. **Configured Backend** - Express server now supports HTTPS
3. **Configured Frontend** - Next.js now runs with HTTPS via custom server
4. **Updated Scripts** - Package.json scripts updated to use HTTPS

## 📁 Files Modified

- `✅ certs/localhost.pem` - SSL certificate
- `✅ certs/localhost-key.pem` - Private key
- `✅ backend/src/server.ts` - HTTPS configuration
- `✅ frontend/server.js` - Custom HTTPS server for Next.js
- `✅ frontend/package.json` - Updated dev script
- `✅ generate-certs.js` - Certificate generation script

## 🚀 How to Run

### 1. Update Environment Variables

**Backend** (`backend/.env`):
```env
FRONTEND_ORIGIN=https://localhost:3000
```

**Frontend** (already updated in package.json):
```
NEXT_PUBLIC_API_URL=https://localhost:4000/api
```

### 2. Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
🔒 Backend HTTPS server running on https://localhost:4000
```

### 3. Start Frontend Server

```bash
cd frontend
npm run dev
```

You should see:
```
🔒 Frontend HTTPS server ready on https://localhost:3000
```

### 4. Access the Application

Open your browser and navigate to:
```
https://localhost:3000
```

## ⚠️ Browser Security Warning

Your browser will show a security warning because the certificate is self-signed. This is **NORMAL** for local development.

### How to Bypass:

**Chrome/Edge:**
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"

**Firefox:**
1. Click "Advanced"
2. Click "Accept the Risk and Continue"

**Safari:**
1. Click "Show Details"
2. Click "visit this website"

## 🔄 Switching Back to HTTP

If you need to run without HTTPS:

**Frontend:**
```bash
npm run dev:http
```

**Backend:** Remove/rename the `certs` folder temporarily

## 🛠️ Regenerating Certificates

If certificates expire or get corrupted:

```bash
node generate-certs.js
```

## 📝 Notes

- Certificates are valid for 365 days
- Certificates are **NOT** added to git (in .gitignore)
- Each developer needs to generate their own certificates
- Self-signed certificates should **NEVER** be used in production

## 🔐 Security

The certificates are stored in `certs/` and are ignored by git. They contain:
- `localhost.pem` - Public certificate
- `localhost-key.pem` - Private key (**keep secret!**)

## 🐛 Troubleshooting

### "EADDRINUSE" Error
Port is already in use. Kill the process or change the port.

### "Certificate not found" Error
Run: `node generate-certs.js`

### "Connection refused"
Make sure the server is running on HTTPS port (3000 for frontend, 4000 for backend)

### Mixed Content Warnings
Make sure both frontend and backend are using HTTPS, and NEXT_PUBLIC_API_URL uses `https://`

## 📚 Additional Info

- Backend falls back to HTTP if certificates aren't found
- Frontend requires certificates (will show error if missing)
- Browsers cache certificate decisions - use incognito mode for testing

