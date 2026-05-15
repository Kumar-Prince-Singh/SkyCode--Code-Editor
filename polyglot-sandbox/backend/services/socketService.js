const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust in production
            methods: ["GET", "POST"]
        }
      });

    io.on('connection', (socket) => {
        console.log('User connected to real-time logs:', socket.id);
        
        socket.on('join_submission', (submissionId) => {
            socket.join(submissionId);
            console.log(`Socket ${socket.id} joined room: ${submissionId}`);
        });

        socket.on('join_user', (userId) => {
            socket.join(`user_${userId}`);
            console.log(`Socket ${socket.id} joined user room: user_${userId}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

const emitProgress = (submissionId, status, logs = "", data = null) => {
    if (io) {
        io.to(submissionId).emit('execution_progress', {
            status,
            logs,
            data,
            timestamp: new Date()
        });
    }
};

module.exports = { initSocket, getIO, emitProgress };
