import { useEffect, useRef, useCallback } from "react";
import config from "../config";
import type { ClientMessage, ServerMessage } from "../types";

export function useWebSocket(
  token: string,
  onMessage: (data: ServerMessage) => void,
  onReconnect?: () => void,
) {
  const ws = useRef<WebSocket | null>(null);
  const currentChannelRef = useRef<string | null>(null);
  const intentionalClose = useRef(false);
  const onMessageRef = useRef(onMessage);
  const onReconnectRef = useRef(onReconnect);
  const isFirstConnect = useRef(true);
  // Store token in a ref so connect() never needs to be recreated when it changes
  const tokenRef = useRef(token);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onReconnectRef.current = onReconnect; }, [onReconnect]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // connect is stable forever — no dependencies means no new references, no re-runs
  const connect = useCallback(() => {
    if (
      ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING
    ) return;

    ws.current = new WebSocket(`${config.WS}?token=${tokenRef.current}`);
    let heartbeatInterval: ReturnType<typeof setInterval>;

    ws.current.onopen = () => {
      console.log("Yakk connected");

      if (currentChannelRef.current) {
        ws.current!.send(JSON.stringify({ type: "join", channelId: currentChannelRef.current }));
      }

      if (!isFirstConnect.current) {
        onReconnectRef.current?.();
      }
      isFirstConnect.current = false;

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Runs once on mount, cleans up on unmount — connect is stable so this never re-runs
  useEffect(() => {
    intentionalClose.current = false;
    isFirstConnect.current = true;
    connect();
    return () => {
      intentionalClose.current = true;
      ws.current?.close();
      ws.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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