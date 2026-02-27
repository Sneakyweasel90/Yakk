import { useState, useRef, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 230;

interface Props {
  children: React.ReactNode;
}

export default function ResizableSidebar({ children }: Props) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startWidth.current = width;
      setDragging(true);

      const onMouseMove = (e: MouseEvent) => {
        const delta = e.clientX - startX.current;
        const newWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startWidth.current + delta),
        );
        setWidth(newWidth);
      };

      const onMouseUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width],
  );

  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        position: "relative",
        width: `${width}px`,
        height: "100%",
      }}
    >
      <div style={{ width: "100%", overflow: "hidden", height: "100%"}}>{children}</div>
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          cursor: "col-resize",
          background: dragging ? theme.primary : "transparent",
          transition: "background 0.15s",
          zIndex: 10,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = theme.primaryDim)
        }
        onMouseLeave={(e) => {
          if (!dragging) e.currentTarget.style.background = "transparent";
        }}
      />
    </div>
  );
}
