export default function Sidebar() {
  return (
    <aside style={{ padding: 16, borderRight: "1px solid var(--border)", width: 240 }}>
      <nav>
        <ul>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/rooms">Rooms</a></li>
        </ul>
      </nav>
    </aside>
  );
}

