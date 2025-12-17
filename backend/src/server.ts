import "dotenv/config";
import express from "express";
import cors from "cors";
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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server running on port ${PORT}`);
});


