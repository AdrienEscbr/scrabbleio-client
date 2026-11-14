import { io } from 'socket.io-client';
import { useApp } from './store.js';

const TOKEN_KEY = 'scrabbleio:token';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? `http://${location.hostname}:3001` : 'https://scrabbleio-server.onrender.com');

function readToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function saveToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* private mode: identity lasts for this tab */ }
}

let memoryToken = readToken();

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  // A function, so every reconnection sends the latest token.
  auth: (cb) => cb({ token: memoryToken }),
});

const { setConnection, setSession, setRoom } = useApp.getState();

socket.on('connect', () => setConnection('online'));
socket.on('disconnect', () => setConnection('offline'));
socket.io.on('reconnect_attempt', () => setConnection('connecting'));
socket.on('connect_error', () => setConnection('offline'));

socket.on('session', ({ token, ...session }) => {
  memoryToken = token;
  saveToken(token);
  setSession(session);
});

socket.on('room:state', (room) => {
  const current = useApp.getState().room;
  if (!current || current.id === room.id) setRoom(room);
});

export function connect() {
  if (!socket.connected && !socket.active) {
    setConnection('connecting');
    socket.connect();
  }
}

export class ApiError extends Error {
  constructor(code, details) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

function waitForConnection(timeoutMs) {
  if (socket.connected) return Promise.resolve();
  connect();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { socket.off('connect', ok); reject(new ApiError('OFFLINE')); }, timeoutMs);
    const ok = () => { clearTimeout(t); resolve(); };
    socket.once('connect', ok);
  });
}

/** Emits a command and resolves with the ack, or throws an ApiError. */
export async function call(event, payload = {}, { connectTimeoutMs = 75_000 } = {}) {
  // Render's free tier sleeps: the first connection can take up to a minute.
  await waitForConnection(connectTimeoutMs);
  let res;
  try {
    res = await socket.timeout(10_000).emitWithAck(event, payload);
  } catch {
    throw new ApiError('TIMEOUT');
  }
  if (!res?.ok) throw new ApiError(res?.error || 'INTERNAL', res?.details);
  return res;
}

// Wake the server early (Render cold start) as soon as the app loads.
connect();

if (import.meta.env.DEV) window.__scrabble = { useApp, socket };
