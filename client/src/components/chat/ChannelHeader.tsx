import { useTheme } from "../../context/ThemeContext";

interface Props {
  channel: string;
  onlineCount: number;
}

export default function ChannelHeader({ channel, onlineCount }: Props) {
  const { theme } = useTheme();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.75rem 1.5rem", borderBottom: "1px solid",
      background: theme.surface, borderColor: theme.border, flexShrink: 0,
    }}>
      <span style={{ color: theme.textDim }}>#</span>
      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1rem", color: theme.primary }}>
        {channel}
      </span>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${theme.border}, transparent)` }} />
      <span style={{ fontSize: "0.72rem", fontFamily: "'Share Tech Mono', monospace", color: theme.textDim, flexShrink: 0 }}>
        <span style={{ color: "#4ade80", marginRight: "4px" }}>●</span>
        {onlineCount} online
      </span>
    </div>
  );
}