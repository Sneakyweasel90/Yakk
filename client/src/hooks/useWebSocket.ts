import { useEffect, useRef, useCallback } from "react";
import config from "../config";
import type { ClientMessage, ServerMessage } from "../types";

export function useWebSocket(
  token: string,
  onMessage: (data: ServerMessage) => void
) {
  const ws = useRef<WebSocket | null>(null);
  const currentChannelRef = useRef<string | null>(null);
  const intentionalClose = useRef(false);

  const connect = useCallback(() => {
    ws.current = new WebSocket(`${config.WS}?token=${token}`);

    ws.current.onopen = () => {
      console.log("Yakk connected");
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

  // Call this on logout to cleanly close the socket before clearing auth state,
  // so the server fires onclose immediately and removes the user from Redis
  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    ws.current?.close();
    ws.current = null;
  }, []);

  return { send, disconnect };
}