import { create } from 'zustand';

/**
 * Global app state fed by the socket.
 * connection: 'idle' | 'connecting' | 'online' | 'offline'
 */
export const useApp = create((set) => ({
  connection: 'idle',
  session: null,
  room: null,
  clockOffset: 0, // serverNow - Date.now()

  setConnection: (connection) => set({ connection }),
  setSession: (session) => set({ session }),
  setRoom: (room) => set(room
    ? { room, clockOffset: room.serverNow - Date.now() }
    : { room: null }),
}));

export const serverNow = () => Date.now() + useApp.getState().clockOffset;
