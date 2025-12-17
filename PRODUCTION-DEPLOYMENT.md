# Production Deployment Guide

## 🌐 Production Domains

- **Frontend**: `https://gruporeis.reisfundacoes.com`
- **Backend API**: `https://api.reisfundacoes.com`

## 📋 Pre-Deployment Checklist

### Frontend Configuration

1. **Environment Variables** (`.env.production` or server environment):
   ```env
   NEXT_PUBLIC_API_URL=https://api.reisfundacoes.com/api
   NEXTAUTH_URL=https://gruporeis.reisfundacoes.com
   NEXTAUTH_SECRET=<strong-random-secret>
   NODE_ENV=production
   ```

2. **Build Command**:
   ```bash
   npm run build:prod
   # or
   npm run build
   ```

3. **Start Command**:
   ```bash
   npm start
   ```

### Backend Configuration

1. **Environment Variables** (`.env`):
   ```env
   MONGO_URI=mongodb://your-production-mongo-uri
   PORT=4000
   FRONTEND_ORIGIN=https://gruporeis.reisfundacoes.com
   NEXTAUTH_URL=https://gruporeis.reisfundacoes.com
   NEXTAUTH_SECRET=<same-secret-as-frontend>
   ```

2. **Start Command**:
   ```bash
   npm run dev  # Development
   # or use PM2 for production:
   pm2 start src/server.ts --name gruporeis-backend
   ```

## 🔒 SSL/HTTPS Configuration

### Production SSL Certificates

**DO NOT use self-signed certificates in production!**

Use proper SSL certificates from:
- Let's Encrypt (free)
- Your hosting provider
- Commercial CA

### Reverse Proxy Setup (Recommended)

Use **Nginx** or **Apache** as reverse proxy with proper SSL:

#### Nginx Example Configuration

**Frontend** (`/etc/nginx/sites-available/gruporeis.reisfundacoes.com`):
```nginx
server {
    listen 443 ssl http2;
    server_name grupreis.reisfundacoes.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name grupreis.reisfundacoes.com;
    return 301 https://$server_name$request_uri;
}
```

**Backend** (`/etc/nginx/sites-available/api.reisfundacoes.com`):
```nginx
server {
    listen 443 ssl http2;
    server_name api.reisfundacoes.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.reisfundacoes.com;
    return 301 https://$server_name$request_uri;
}
```

## 🚀 Deployment Steps

### 1. Frontend Deployment

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
export NEXT_PUBLIC_API_URL=https://api.reisfundacoes.com/api
export NEXTAUTH_URL=https://gruporeis.reisfundacoes.com
export NEXTAUTH_SECRET=<your-secret>

# Build for production
npm run build

# Start (or use PM2)
npm start
# or
pm2 start npm --name gruporeis-frontend -- start
```

### 2. Backend Deployment

```bash
cd backend

# Install dependencies
npm install

# Set environment variables
export FRONTEND_ORIGIN=https://gruporeis.reisfundacoes.com
export MONGO_URI=<your-production-mongo-uri>

# Start (or use PM2)
npm run dev
# or
pm2 start npm --name gruporeis-backend -- run dev
```

## 🔐 Security Checklist

- [ ] Use strong `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Use proper SSL certificates (not self-signed)
- [ ] Set `FRONTEND_ORIGIN` to exact production domain (not `*`)
- [ ] Use environment variables (never commit `.env` files)
- [ ] Enable HTTPS only (redirect HTTP to HTTPS)
- [ ] Use reverse proxy (Nginx/Apache) for SSL termination
- [ ] Keep dependencies updated
- [ ] Use strong MongoDB credentials
- [ ] Enable MongoDB authentication

## 📝 Important Notes

1. **Self-signed certificates** (`certs/` folder) are **ONLY for local development**
2. **Production must use proper SSL certificates** from a trusted CA
3. The `server.js` file automatically detects production and uses HTTP (behind reverse proxy)
4. Backend also detects production and uses HTTP (behind reverse proxy)
5. Both servers should run behind Nginx/Apache with proper SSL

## 🐛 Troubleshooting

### CORS Errors
- Check `FRONTEND_ORIGIN` in backend matches frontend domain exactly
- Ensure no trailing slashes in URLs

### API Connection Errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend is running and accessible
- Verify SSL certificates are valid

### NextAuth Errors
- Ensure `NEXTAUTH_SECRET` is the same in both frontend and backend
- Check `NEXTAUTH_URL` matches frontend domain

## 📞 Support

For deployment issues, check:
1. Server logs (frontend and backend)
2. Nginx/Apache error logs
3. Browser console for frontend errors
4. Network tab for API request failures

