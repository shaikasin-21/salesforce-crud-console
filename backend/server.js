require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const salesforceRoutes = require('./routes/salesforce');

const app = express();

app.set('trust proxy', 1);

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

const isProd = process.env.NODE_ENV === 'production';

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

app.use('/auth', authRoutes);
app.use('/api', salesforceRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(Backend listening on port ${PORT});
});
