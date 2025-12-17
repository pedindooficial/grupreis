# Production Configuration Summary

## ✅ Code is Production-Ready!

All code has been updated to use environment variables. The following configuration is needed for production deployment.

## 🌐 Production Domains

- **Frontend**: `https://gruporeis.reisfundacoes.com`
- **Backend API**: `https://api.reisfundacoes.com`

## 📝 Required Environment Variables

### Frontend (`.env.production` or server environment)

```env
# API Backend URL
NEXT_PUBLIC_API_URL=https://api.reisfundacoes.com/api

# NextAuth Configuration
NEXTAUTH_URL=https://gruporeis.reisfundacoes.com
NEXTAUTH_SECRET=<generate-strong-secret>

# Node Environment
NODE_ENV=production
```

### Backend (`.env`)

```env
# Database
MONGO_URI=mongodb://your-production-mongo-uri

# Server
PORT=4000

# CORS - Frontend Origin
FRONTEND_ORIGIN=https://gruporeis.reisfundacoes.com

# NextAuth (must match frontend)
NEXTAUTH_URL=https://gruporeis.reisfundacoes.com
NEXTAUTH_SECRET=<same-secret-as-frontend>
```

## 🔐 Generate NEXTAUTH_SECRET

```bash
# Generate a strong secret
openssl rand -base64 32
```

**Important**: Use the same `NEXTAUTH_SECRET` in both frontend and backend!

## 🚀 Build & Deploy Commands

### Frontend

```bash
cd frontend

# Set environment variables
export NEXT_PUBLIC_API_URL=https://api.reisfundacoes.com/api
export NEXTAUTH_URL=https://gruporeis.reisfundacoes.com
export NEXTAUTH_SECRET=<your-secret>
export NODE_ENV=production

# Build
npm run build

# Start
npm start
```

### Backend

```bash
cd backend

# Set environment variables
export FRONTEND_ORIGIN=https://gruporeis.reisfundacoes.com
export MONGO_URI=<your-production-mongo-uri>
export NEXTAUTH_SECRET=<same-secret-as-frontend>
export NODE_ENV=production

# Start
npm run dev
# or use PM2:
pm2 start npm --name gruporeis-backend -- run dev
```

## 🔒 SSL/HTTPS Notes

1. **Self-signed certificates** (`certs/` folder) are **ONLY for local development**
2. **Production must use proper SSL certificates** from a trusted CA (Let's Encrypt, etc.)
3. Both servers automatically detect production and use HTTP (behind reverse proxy)
4. Use **Nginx** or **Apache** as reverse proxy with proper SSL certificates

## ✅ What's Already Configured

- ✅ All API URLs use `NEXT_PUBLIC_API_URL` environment variable
- ✅ Backend CORS uses `FRONTEND_ORIGIN` environment variable
- ✅ HTTPS only in development (self-signed certs)
- ✅ HTTP in production (for reverse proxy)
- ✅ Fallback URLs updated to production domains
- ✅ All hardcoded localhost URLs removed

## 📋 Deployment Checklist

- [ ] Set `NEXT_PUBLIC_API_URL=https://api.reisfundacoes.com/api` in frontend
- [ ] Set `FRONTEND_ORIGIN=https://gruporeis.reisfundacoes.com` in backend
- [ ] Generate and set `NEXTAUTH_SECRET` (same in both)
- [ ] Configure MongoDB connection string
- [ ] Set up SSL certificates (Let's Encrypt recommended)
- [ ] Configure reverse proxy (Nginx/Apache) with SSL
- [ ] Test API connectivity between frontend and backend
- [ ] Test authentication flow
- [ ] Test operations links

## 🐛 Common Issues

### CORS Errors
- Ensure `FRONTEND_ORIGIN` in backend matches frontend domain exactly
- No trailing slashes: `https://gruporeis.reisfundacoes.com` (not `https://gruporeis.reisfundacoes.com/`)

### API Connection Errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend is running and accessible
- Verify SSL certificates are valid

### NextAuth Errors
- Ensure `NEXTAUTH_SECRET` is identical in both frontend and backend
- Check `NEXTAUTH_URL` matches frontend domain exactly

