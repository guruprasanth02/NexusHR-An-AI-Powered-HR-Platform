import { Server } from 'socket.io';

const userSockets = new Map<string, string[]>(); // userId -> [socketId]

export const initSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('join', (userId: string) => {
      socket.join(`user:${userId}`);
      const existing = userSockets.get(userId) || [];
      userSockets.set(userId, [...existing, socket.id]);
      console.log(`[Socket] User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
      // Clean up userSockets map
      userSockets.forEach((sockets, userId) => {
        const updated = sockets.filter((s) => s !== socket.id);
        if (updated.length === 0) {
          userSockets.delete(userId);
        } else {
          userSockets.set(userId, updated);
        }
      });
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
};

export const emitToUser = (io: Server, userId: string, event: string, data: unknown) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToAll = (io: Server, event: string, data: unknown) => {
  io.emit(event, data);
};
