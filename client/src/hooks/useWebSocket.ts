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
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    // Guard against duplicate connections
    if (ws.current?.readyState === WebSocket.OPEN ||
        ws.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    ws.current = new WebSocket(`${config.WS}?token=${token}`);
    let heartbeatInterval: ReturnType<typeof setInterval>;

    ws.current.onopen = () => {
      console.log("Yakk connected");
      if (currentChannelRef.current) {
        ws.current!.send(
          JSON.stringify({ type: "join", channelId: currentChannelRef.current })
        );
      }
      // Start heartbeat every 30 seconds
      heartbeatInterval = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.current.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as ServerMessage;
      onMessageRef.current(data);
    };

    ws.current.onclose = () => {
      clearInterval(heartbeatInterval);
      if (!intentionalClose.current) {
        setTimeout(connect, 2000);
      }
    };
  }, [token]);

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

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    ws.current?.close();
    ws.current = null;
  }, []);

  return { send, disconnect };
}