// Helper: print a bcrypt hash for a password.
//   npm run hash -- mySecret
import bcrypt from 'bcrypt';

const password = process.argv[2] ?? 'password123';
const hash = await bcrypt.hash(password, 10);
console.log(`password : ${password}`);
console.log(`hash     : ${hash}`);
console.log(`matches? : ${await bcrypt.compare(password, hash)}`);
