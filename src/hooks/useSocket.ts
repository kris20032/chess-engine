import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket if not already created
    if (!socket) {
      // Use environment variable, or default to current origin for production
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
      });
    }

    // Set up connection handlers
    const handleConnect = () => {
      console.log('Socket connected:', socket?.id);
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Check if already connected
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      // Don't disconnect on unmount - keep connection alive
    };
  }, []);

  return { socket, isConnected };
}

export function getSocket() {
  return socket;
}
