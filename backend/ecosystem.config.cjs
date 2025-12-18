module.exports = {
  apps: [{
    name: 'gruporeis-backend',
    script: 'dist/server.js',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      
      // MongoDB Configuration
      MONGODB_URI: 'mongodb+srv://gruporeisuser:81221513Ak@gruporeis.5sg5ru5.mongodb.net/gruporeis_prod?retryWrites=true&w=majority',
      
      // Frontend URL (for CORS)
      FRONTEND_ORIGIN: 'https://gruporeis.reisfundacoes.com',
      
      // NextAuth Configuration (must match frontend)
      NEXTAUTH_URL: 'https://gruporeis.reisfundacoes.com',
      NEXTAUTH_SECRET: 'CHANGE-THIS-TO-A-STRONG-RANDOM-SECRET-IN-PRODUCTION',
      
      // Google Maps API
      GOOGLE_MAPS_API_KEY: "AIzaSyAUoyCSevBWa4CkeDcBuYd-R0mbR2NtpIs",
      
      // AWS S3 Configuration (for file uploads)
      // IMPORTANT: Set these as environment variables or use PM2 env_file
      // Do not commit actual credentials to git!
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
      AWS_REGION: process.env.AWS_REGION || 'sa-east-1',
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'gruporeis'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart on crash
    min_uptime: '10s',
    max_restarts: 10,
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};

