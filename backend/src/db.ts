import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Defina MONGODB_URI no ambiente (.env) do backend");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseBackendCache: MongooseCache | undefined;
}

let cached = global.mongooseBackendCache;

if (!cached) {
  cached = global.mongooseBackendCache = { conn: null, promise: null };
}

export async function connectDB() {
  // Ensure cached is defined
  if (!cached) {
    cached = global.mongooseBackendCache = { conn: null, promise: null };
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}


