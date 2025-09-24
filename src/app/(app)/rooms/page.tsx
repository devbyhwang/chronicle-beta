import RoomList from "@/components/common/room-list";

type Room = { id: string; name: string; members?: number };

export default async function RoomsPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/rooms`, {
    cache: "no-store",
  }).catch(() => null);
  let rooms: Room[] = [];
  try {
    const data = (await res?.json()) as { rooms?: Room[] } | undefined;
    rooms = (data?.rooms ?? []).map((r, i) => ({ ...r, members: 10 + i * 5 }));
  } catch {}

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">방 목록</h1>
          <p className="text-sm text-muted-foreground">주제를 선택하거나 새 방을 만들어보세요.</p>
        </div>
        <a
          href="/rooms/new"
          className="px-3 py-2 rounded-md border border-border hover:bg-accent text-sm"
        >
          새 방 만들기
        </a>
      </div>

      <RoomList rooms={rooms} />
    </div>
  );
}
