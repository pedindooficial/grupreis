"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error("Defina MONGODB_URI no ambiente (.env) do backend");
}
let cached = global.mongooseBackendCache;
if (!cached) {
    cached = global.mongooseBackendCache = { conn: null, promise: null };
}
async function connectDB() {
    // Ensure cached is defined
    if (!cached) {
        cached = global.mongooseBackendCache = { conn: null, promise: null };
    }
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        cached.promise = mongoose_1.default.connect(MONGODB_URI);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
