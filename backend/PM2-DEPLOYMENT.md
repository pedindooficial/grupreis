# PM2 Deployment Guide for Gruporeis Backend

## 📋 Prerequisites

1. **Build the backend**:
   ```bash
   cd backend
   npm run build
   ```

2. **Install PM2 globally** (if not already installed):
   ```bash
   npm install -g pm2
   ```

## 🔧 Configuration

### 1. Update `ecosystem.config.cjs`

Edit `backend/ecosystem.config.cjs` and update the following environment variables:

#### Required Variables:

- **MONGODB_URI**: Your production MongoDB connection string
- **FRONTEND_ORIGIN**: `https://gruporeis.reisfundacoes.com`
- **NEXTAUTH_URL**: `https://gruporeis.reisfundacoes.com`
- **NEXTAUTH_SECRET**: Generate a strong secret:
  ```bash
  openssl rand -base64 32
  ```
  **Important**: Use the same secret in both frontend and backend!

#### Optional Variables:

- **GOOGLE_MAPS_API_KEY**: Your Google Maps API key (if using distance/geocoding features)

#### AWS S3 Credentials (Set as Environment Variables):

**IMPORTANT**: AWS credentials are NOT in `ecosystem.config.cjs` for security. Set them as environment variables:

```bash
# Option 1: Export before starting PM2
export AWS_ACCESS_KEY_ID='your-access-key'
export AWS_SECRET_ACCESS_KEY='your-secret-key'
export AWS_REGION='sa-east-1'
export AWS_S3_BUCKET_NAME='gruporeis'
pm2 start ecosystem.config.cjs

# Option 2: Create a .env file (not committed to git) and use dotenv
# Or set them in your server's environment (systemd, etc.)
```

### 2. Create Logs Directory

```bash
mkdir -p backend/logs
```

## 🚀 Deployment Steps

### 1. Build the Backend

```bash
cd backend
npm install
npm run build
```

### 2. Start with PM2

```bash
pm2 start ecosystem.config.cjs
```

### 3. Save PM2 Configuration

```bash
pm2 save
pm2 startup
```

The `pm2 startup` command will generate a command to run on system boot. Execute that command as root.

## 📊 PM2 Commands

### View Status
```bash
pm2 status
pm2 logs gruporeis-backend
```

### Restart
```bash
pm2 restart gruporeis-backend
```

### Stop
```bash
pm2 stop gruporeis-backend
```

### Delete
```bash
pm2 delete gruporeis-backend
```

### Monitor
```bash
pm2 monit
```

### View Logs
```bash
# All logs
pm2 logs gruporeis-backend

# Error logs only
pm2 logs gruporeis-backend --err

# Output logs only
pm2 logs gruporeis-backend --out

# Or check log files directly
tail -f backend/logs/combined.log
```

## 🔄 Updating the Application

1. **Pull latest code**:
   ```bash
   git pull
   ```

2. **Install dependencies** (if needed):
   ```bash
   cd backend
   npm install
   ```

3. **Rebuild**:
   ```bash
   npm run build
   ```

4. **Restart PM2**:
   ```bash
   pm2 restart gruporeis-backend
   ```

## 🔍 Troubleshooting

### Check if backend is running
```bash
pm2 status
curl http://localhost:4000/api/health
```

The health endpoint returns:
- **200 OK**: Service is healthy (database connected)
- **503 Service Unavailable**: Service is unhealthy (database disconnected or error)

Example response (healthy):
```json
{
  "status": "ok",
  "timestamp": "2025-12-17T23:45:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "database": {
    "status": "connected",
    "readyState": 1
  },
  "memory": {
    "used": 45,
    "total": 128,
    "unit": "MB"
  }
}
```

### View detailed logs
```bash
pm2 logs gruporeis-backend --lines 100
```

### Check memory usage
```bash
pm2 monit
```

### Restart on crash
PM2 is configured to automatically restart the app if it crashes (max 10 restarts).

### Port already in use
If port 4000 is already in use:
1. Change `PORT` in `ecosystem.config.cjs`
2. Update your reverse proxy (Nginx) configuration
3. Restart PM2: `pm2 restart gruporeis-backend`

## 📝 Notes

- The backend runs on **port 4000** by default
- Logs are stored in `backend/logs/` directory
- PM2 will automatically restart the app if it crashes
- The app uses **1GB memory limit** - adjust `max_memory_restart` if needed
- Make sure your reverse proxy (Nginx) is configured to proxy requests to `http://localhost:4000`

## 🔐 Security Checklist

- [ ] Change `NEXTAUTH_SECRET` to a strong random value
- [ ] Use strong MongoDB credentials
- [ ] Keep AWS credentials secure (never commit to git)
- [ ] Use environment variables or PM2 ecosystem file (not hardcoded)
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS in production (via reverse proxy)

