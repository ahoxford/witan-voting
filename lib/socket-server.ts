import type { Server as SocketIOServer } from "socket.io";

export function getIO(): SocketIOServer | null {
  return (global as Record<string, unknown>).io as SocketIOServer | null;
}

export function emitRoomUpdate(roomId: string, event: string, data: unknown) {
  const io = getIO();
  if (io) {
    io.to(`screen:${roomId}`).emit(event, data);
  }
}
