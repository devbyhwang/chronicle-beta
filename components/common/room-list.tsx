interface Room { id: string; name: string; members?: number }

export default function RoomList({ rooms }: { rooms: Room[] }) {
  if (!rooms || rooms.length === 0) {
    return <div className="text-sm text-muted-foreground">표시할 방이 없습니다.</div>;
  }
  return (
    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rooms.map((r) => (
        <li key={r.id} className="border border-border rounded-lg p-3 hover:bg-accent/50">
          <a href={`/rooms/${r.id}`} className="flex items-center justify-between">
            <span className="font-medium">{r.name}</span>
            {typeof r.members === "number" && (
              <span className="text-xs text-muted-foreground">{r.members}명</span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
