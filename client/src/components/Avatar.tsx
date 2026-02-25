import React from "react";

// Generate a deterministic hue from a username string
function usernameToHue(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

interface Props {
  username: string;
  size?: number;
  style?: React.CSSProperties;
}

export default function Avatar({ username, size = 32, style }: Props) {
  const hue = usernameToHue(username);
  const bg = `hsl(${hue}, 55%, 28%)`;
  const border = `hsl(${hue}, 70%, 50%)`;
  const text = `hsl(${hue}, 80%, 75%)`;
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "4px",
        background: bg,
        border: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "'Orbitron', monospace",
        fontWeight: 700,
        fontSize: size * 0.34,
        color: text,
        letterSpacing: "0.05em",
        userSelect: "none",
        boxShadow: `0 0 8px ${border}33`,
        ...style,
      }}
      title={username}
    >
      {initials}
    </div>
  );
}