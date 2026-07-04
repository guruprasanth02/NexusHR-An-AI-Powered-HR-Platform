'use client';

import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore, useUIStore, AppNotification } from '@/lib/store';

let socket: Socket | null = null;

export function useSocket() {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { setUnreadCount } = useUIStore();

  const connect = useCallback(() => {
    if (socket?.connected || !user) return;

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      withCredentials: true,
    });

    socket.on('connect', () => {
      socket?.emit('join', user.id);
    });

    socket.on('notification:new', (notif: AppNotification) => {
      addNotification(notif);
      setUnreadCount(useUIStore.getState().unreadCount + 1);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });
  }, [user, addNotification, setUnreadCount]);

  const disconnect = useCallback(() => {
    socket?.disconnect();
    socket = null;
  }, []);

  useEffect(() => {
    connect();
    return () => { disconnect(); };
  }, [connect, disconnect]);

  return { socket, connect, disconnect };
}
