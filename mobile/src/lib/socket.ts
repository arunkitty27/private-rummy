/**
 * socket.ts — Singleton Socket.IO client
 *
 * Created once at module load. Never recreated (even on hot-reload in dev)
 * because Socket.IO manages its own reconnection lifecycle.
 */

import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from './constants';

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return _socket;
}

/**
 * Emit with acknowledgement and a timeout.
 * Returns the server response or throws on timeout/error.
 */
export function emitWithAck(
  event: string,
  payload: object,
  timeoutMs = 15000
): Promise<any> {
  const socket = getSocket();
  return new Promise((resolve, reject) => {
    if (!socket.connected) socket.connect();
    socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, result: any) => {
      if (err) {
        reject(new Error('Server did not respond. Check your internet connection.'));
      } else if (result && !result.success) {
        reject(new Error(result.message || 'Request failed.'));
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Wait for a socket connection to be established.
 */
export function waitForConnect(timeoutMs = 15000): Promise<void> {
  const socket = getSocket();
  if (socket.connected) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Could not connect to the game server. Check your internet connection.'));
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (e: Error) => {
      clearTimeout(timer);
      reject(new Error(`Connection failed: ${e.message}`));
    });

    socket.connect();
  });
}
