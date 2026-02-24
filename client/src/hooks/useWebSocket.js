import { useEffect, useRef, useCallback } from "react";
import config from "../config";

export function useWebSocket(token, onMessage) {
  const ws = useRef(null);

  const connect = useCallback(() => {
    ws.current = new WebSocket(`${config.WS}?token=${token}`);
    ws.current.onopen = () => {
      console.log("Yakk connected");
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      //console.log("Received:", data);
      onMessage(data);
    };

    ws.current.onclose = () => {
      //console.log("Disconnected, reconnecting in 2s...");
      setTimeout(connect, 2000);
    };
  }, [token, onMessage]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);

  const send = useCallback((data) => {
    const doSend = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(data));
      }
    };

    // If already open, send immediately, otherwise wait for open
    if (ws.current?.readyState === WebSocket.OPEN) {
      doSend();
    } else {
      ws.current.addEventListener("open", doSend, { once: true });
    }
  }, []);

  return { send };
}