import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Defina MONGODB_URI no arquivo .env");
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI);
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}

