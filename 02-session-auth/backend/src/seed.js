// Resets the database to the demo state.   npm run seed
import bcrypt from 'bcrypt';
import { client, db, users, ensureIndexes } from './db.js';

const PASSWORD = 'password123';
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

const people = [
  {
    name: 'Neha Kapoor', email: 'admin@harbor.bank', role: 'admin',
    accounts: [], transactions: [],
  },
  {
    name: 'Ananya Rao', email: 'ananya@harbor.bank', role: 'customer',
    accounts: [
      { type: 'Savings', number: '•••• 4821', balance: 248350.75 },
      { type: 'Fixed deposit', number: '•••• 1907', balance: 500000 },
    ],
    transactions: [
      { date: daysAgo(0), description: 'Salary · Acme Corp', amount: 185000 },
      { date: daysAgo(1), description: 'Rent · UPI', amount: -42000 },
      { date: daysAgo(2), description: 'Groceries · BigBasket', amount: -3260.5 },
      { date: daysAgo(4), description: 'Electricity bill', amount: -2180 },
    ],
  },
  {
    name: 'Vikram Singh', email: 'vikram@harbor.bank', role: 'customer',
    accounts: [{ type: 'Current', number: '•••• 7733', balance: 912440.1 }],
    transactions: [
      { date: daysAgo(0), description: 'Client payment · INV-2291', amount: 320000 },
      { date: daysAgo(3), description: 'GST payment', amount: -58400 },
      { date: daysAgo(5), description: 'Office supplies', amount: -7820 },
    ],
  },
  {
    name: 'Meera Joshi', email: 'meera@harbor.bank', role: 'customer',
    accounts: [{ type: 'Savings', number: '•••• 3305', balance: 18620.4 }],
    transactions: [
      { date: daysAgo(1), description: 'Stipend', amount: 25000 },
      { date: daysAgo(2), description: 'Coffee · UPI', amount: -240 },
      { date: daysAgo(6), description: 'Mobile recharge', amount: -599 },
    ],
  },
];

await db.dropDatabase();
await ensureIndexes();

for (const p of people) {
  await users.insertOne({
    ...p,
    passwordHash: await bcrypt.hash(PASSWORD, 10),
    status: 'active',
    createdAt: new Date(),
  });
}

console.log(`Seeded ${people.length} users into "${db.databaseName}". Password for all: ${PASSWORD}`);
await client.close();
