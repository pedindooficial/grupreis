import "dotenv/config";
import express from "express";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import clientsRouter from "./routes/clients";
import settingsRouter from "./routes/settings";
import authRouter from "./routes/auth";
import employeesRouter from "./routes/employees";
import teamsRouter from "./routes/teams";
import jobsRouter from "./routes/jobs";
import machinesRouter from "./routes/machines";
import equipmentRouter from "./routes/equipment";
import cashRouter from "./routes/cash";
import cashiersRouter from "./routes/cashiers";
import operationsRouter from "./routes/operations";
import filesRouter from "./routes/files";
import documentsRouter from "./routes/documents";
import usersRouter from "./routes/users";
import auditRouter from "./routes/audit";
import catalogRouter from "./routes/catalog";
import locationCaptureRouter from "./routes/location-capture";
import budgetsRouter from "./routes/budgets";
import travelPricingRouter from "./routes/travel-pricing";
import distanceRouter from "./routes/distance";
import maintenanceRouter from "./routes/maintenance";
import orcamentoRequestsRouter from "./routes/orcamento-requests";
import socialMediaRouter from "./routes/social-media";
import { connectDB } from "./db";
import mongoose from "mongoose";

const app = express();

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

app.use(
  cors({
    origin: FRONTEND_ORIGIN === "*" ? "*" : [FRONTEND_ORIGIN],
    credentials: true
  })
);

app.use(express.json());

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  try {
    // Check database connection
    await connectDB();
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = dbStatus === 1 ? "connected" : dbStatus === 2 ? "connecting" : "disconnected";
    
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbStatusText,
        readyState: dbStatus
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB"
      }
    };

    // If database is not connected, return 503 (Service Unavailable)
    if (dbStatus !== 1) {
      return res.status(503).json({
        ...health,
        status: "unhealthy",
        error: "Database connection failed"
      });
    }

    res.status(200).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error?.message || "Health check failed",
      database: {
        status: "error"
      }
    });
  }
});

app.use("/api/clients", clientsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/auth", authRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/machines", machinesRouter);
app.use("/api/equipment", equipmentRouter);
app.use("/api/cash", cashRouter);
app.use("/api/cashiers", cashiersRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/files", filesRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/users", usersRouter);
app.use("/api/audit", auditRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/location-capture", locationCaptureRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/travel-pricing", travelPricingRouter);
app.use("/api/distance", distanceRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/orcamento-requests", orcamentoRequestsRouter);
app.use("/api/social-media", socialMediaRouter);

// Use HTTPS with self-signed certs only in development
// Production should use HTTP behind reverse proxy (Nginx) with proper SSL
const isDevelopment = process.env.NODE_ENV !== 'production';
const certsPath = path.join(__dirname, "..", "..", "certs");
const keyPath = path.join(certsPath, "localhost-key.pem");
const certPath = path.join(certsPath, "localhost.pem");

if (isDevelopment && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  https.createServer(httpsOptions, app).listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🔒 Backend HTTPS server running on https://localhost:${PORT}`);
    console.log(`   Environment: development`);
  });
} else {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    if (isDevelopment) {
      console.log(`⚠️  Backend HTTP server running on http://localhost:${PORT}`);
      console.log(`   (HTTPS certificates not found at ${certsPath})`);
    } else {
      console.log(`✅ Backend server running on port ${PORT}`);
      console.log(`   Environment: production`);
      console.log(`   Note: Should be behind reverse proxy (nginx) with SSL`);
    }
  });
}


