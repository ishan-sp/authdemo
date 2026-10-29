import { MongoClient } from 'mongodb';

// Official MongoDB driver. It connects lazily on the first query.
const client = new MongoClient(process.env.MONGO_URL);
export const db = client.db(process.env.MONGO_DB);

export const users = db.collection('users');
export const sessions = db.collection('sessions');
export const auditLog = db.collection('audit_log');

export async function ensureIndexes() {
  // TTL index: MongoDB deletes a session document by itself once expiresAt
  // has passed (its cleanup job runs about every 60 seconds).
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  // Fast "all sessions for this user" lookups — needed for revoke-all.
  await sessions.createIndex({ userId: 1 });
  await users.createIndex({ email: 1 }, { unique: true });
}

export function audit(actor, action, target, detail) {
  return auditLog.insertOne({ at: new Date(), actor, action, target, detail });
}

export { client };
