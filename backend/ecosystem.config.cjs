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
      
      // Frontend URL (for CORS) - comma-separated for multiple origins
      FRONTEND_ORIGIN: 'https://gruporeis.reisfundacoes.com,https://www.reisfundacoes.com',
      
      // NextAuth Configuration (must match frontend)
      NEXTAUTH_URL: 'https://gruporeis.reisfundacoes.com',
      NEXTAUTH_SECRET: 'CHANGE-THIS-TO-A-STRONG-RANDOM-SECRET-IN-PRODUCTION',
      
      // Google Maps API
      GOOGLE_MAPS_API_KEY: "AIzaSyBnpJWYv2yT_mFwmuoirSSdGPtLC2I8IYY",
      
      // AWS S3 Configuration (for file uploads)
      // IMPORTANT: Set these as environment variables on the server before starting PM2
      // Do not commit actual credentials to git!
      // Example: export AWS_ACCESS_KEY_ID=... && export AWS_SECRET_ACCESS_KEY=... && pm2 start ecosystem.config.cjs
      // Or create a .env file (not committed) and use: pm2 start ecosystem.config.cjs --env production
      AWS_REGION: 'sa-east-1',
      AWS_S3_BUCKET_NAME: 'gruporeis'
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

