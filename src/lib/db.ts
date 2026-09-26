import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error(
  "MONGODB_URI is not set. Create a .env.local file in the project root (next to package.json) "
  + "with MONGODB_URI=mongodb://127.0.0.1:27017/note-share, then restart the dev server."
);

// Cache the connection across hot-reloads / serverless invocations
interface Cached { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
const globalWithMongoose = global as typeof global & { _mongooseCache?: Cached };
const cached: Cached = globalWithMongoose._mongooseCache ?? { conn: null, promise: null };
globalWithMongoose._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false, maxPoolSize: 20 });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
