import { useEffect, useRef, useCallback } from "react";
import config from "../config";
import type { ClientMessage, ServerMessage } from "../types";

export function useWebSocket(
  token: string,
  onMessage: (data: ServerMessage) => void
) {
  const ws = useRef<WebSocket | null>(null);
  // Track the channel we're currently in so we can re-join after a reconnect
  const currentChannelRef = useRef<string | null>(null);
  const intentionalClose = useRef(false);

  const connect = useCallback(() => {
    ws.current = new WebSocket(`${config.WS}?token=${token}`);

    ws.current.onopen = () => {
      console.log("Yakk connected");
      // Re-join the current channel if we had one — this is what fixes
      // the "messages not showing after idle" bug
      if (currentChannelRef.current) {
        ws.current!.send(
          JSON.stringify({ type: "join", channelId: currentChannelRef.current })
        );
      }
    };

    ws.current.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as ServerMessage;
      onMessage(data);
    };

    ws.current.onclose = () => {
      if (!intentionalClose.current) {
        setTimeout(connect, 2000);
      }
    };
  }, [token, onMessage]);

  useEffect(() => {
    intentionalClose.current = false;
    connect();
    return () => {
      intentionalClose.current = true;
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: ClientMessage) => {
    // Keep track of which channel we're in
    if (data.type === "join") {
      currentChannelRef.current = data.channelId;
    }

    const doSend = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(data));
      }
    };

    if (ws.current?.readyState === WebSocket.OPEN) {
      doSend();
    } else {
      ws.current?.addEventListener("open", doSend, { once: true });
    }
  }, []);

  return { send };
}