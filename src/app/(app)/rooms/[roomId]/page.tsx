import RoomClient from "./room-client";
import { getRoom } from "@/server/inmemory";

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = getRoom(roomId) ?? undefined;
  return <RoomClient roomId={roomId} room={room ? { id: room.id, name: room.name, description: room.description, tags: room.tags } : undefined} />;
}
