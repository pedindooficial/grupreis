"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const clients_1 = __importDefault(require("./routes/clients"));
const settings_1 = __importDefault(require("./routes/settings"));
const auth_1 = __importDefault(require("./routes/auth"));
const employees_1 = __importDefault(require("./routes/employees"));
const teams_1 = __importDefault(require("./routes/teams"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const machines_1 = __importDefault(require("./routes/machines"));
const equipment_1 = __importDefault(require("./routes/equipment"));
const cash_1 = __importDefault(require("./routes/cash"));
const cashiers_1 = __importDefault(require("./routes/cashiers"));
const operations_1 = __importDefault(require("./routes/operations"));
const files_1 = __importDefault(require("./routes/files"));
const documents_1 = __importDefault(require("./routes/documents"));
const users_1 = __importDefault(require("./routes/users"));
const audit_1 = __importDefault(require("./routes/audit"));
const catalog_1 = __importDefault(require("./routes/catalog"));
const location_capture_1 = __importDefault(require("./routes/location-capture"));
const budgets_1 = __importDefault(require("./routes/budgets"));
const travel_pricing_1 = __importDefault(require("./routes/travel-pricing"));
const distance_1 = __importDefault(require("./routes/distance"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
app.use((0, cors_1.default)({
    origin: FRONTEND_ORIGIN === "*" ? "*" : [FRONTEND_ORIGIN],
    credentials: true
}));
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
app.use("/api/clients", clients_1.default);
app.use("/api/settings", settings_1.default);
app.use("/api/auth", auth_1.default);
app.use("/api/employees", employees_1.default);
app.use("/api/teams", teams_1.default);
app.use("/api/jobs", jobs_1.default);
app.use("/api/machines", machines_1.default);
app.use("/api/equipment", equipment_1.default);
app.use("/api/cash", cash_1.default);
app.use("/api/cashiers", cashiers_1.default);
app.use("/api/operations", operations_1.default);
app.use("/api/files", files_1.default);
app.use("/api/documents", documents_1.default);
app.use("/api/users", users_1.default);
app.use("/api/audit", audit_1.default);
app.use("/api/catalog", catalog_1.default);
app.use("/api/location-capture", location_capture_1.default);
app.use("/api/budgets", budgets_1.default);
app.use("/api/travel-pricing", travel_pricing_1.default);
app.use("/api/distance", distance_1.default);
// Use HTTPS with self-signed certs only in development
// Production should use HTTP behind reverse proxy (Nginx) with proper SSL
const isDevelopment = process.env.NODE_ENV !== 'production';
const certsPath = path_1.default.join(__dirname, "..", "..", "certs");
const keyPath = path_1.default.join(certsPath, "localhost-key.pem");
const certPath = path_1.default.join(certsPath, "localhost.pem");
if (isDevelopment && fs_1.default.existsSync(keyPath) && fs_1.default.existsSync(certPath)) {
    const httpsOptions = {
        key: fs_1.default.readFileSync(keyPath),
        cert: fs_1.default.readFileSync(certPath)
    };
    https_1.default.createServer(httpsOptions, app).listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`🔒 Backend HTTPS server running on https://localhost:${PORT}`);
        console.log(`   Environment: development`);
    });
}
else {
    app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        if (isDevelopment) {
            console.log(`⚠️  Backend HTTP server running on http://localhost:${PORT}`);
            console.log(`   (HTTPS certificates not found at ${certsPath})`);
        }
        else {
            console.log(`✅ Backend server running on port ${PORT}`);
            console.log(`   Environment: production`);
            console.log(`   Note: Should be behind reverse proxy (nginx) with SSL`);
        }
    });
}
