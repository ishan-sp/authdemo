import express from 'express';
import cookieParser from 'cookie-parser';
import { ensureIndexes } from './db.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);    // login, logout, me, status
app.use('/api/admin', adminRoutes);  // admin only: revoke, ban
app.use('/api', accountRoutes);      // customer: account, my sessions

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

await ensureIndexes();

const port = process.env.PORT ?? 4001;
app.listen(port, '127.0.0.1', () => {
  console.log(`API running on http://localhost:${port}`);
});
