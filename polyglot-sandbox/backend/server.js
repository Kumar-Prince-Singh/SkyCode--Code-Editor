const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const runRoutes = require('./routes/run');
const http = require('http');
const cookieParser = require('cookie-parser');
const { initSocket } = require('./services/socketService');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start Worker
require('./workers/submissionWorker');

// Body parser
app.use(express.json());
app.use(cookieParser());

// Enable CORS
app.use(cors({
    origin: 'http://localhost:8081',
    credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', runRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
