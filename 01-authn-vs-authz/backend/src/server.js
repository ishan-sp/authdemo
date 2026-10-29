import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import fitnessRoutes from './routes/fitness.js';
import dbConsoleRoutes from './routes/dbConsole.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);     // login, logout, register, me
app.use('/api/db', dbConsoleRoutes);  // demo-only SQL console
app.use('/api', fitnessRoutes);       // the protected app

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const port = process.env.PORT ?? 4000;
app.listen(port, '127.0.0.1', () => {
  console.log(`API running on http://localhost:${port}`);
});
