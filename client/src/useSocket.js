import { useEffect, useRef, useCallback, useState } from "react";

/**
 * WebSocket hook with auto-reconnect, exponential backoff, and keep-alive pings.
 * The keep-alive ping (every 20s) prevents idle connections from being closed
 * by intermediaries like Cloudflare Tunnel.
 */
export function useSocket(onMessage) {
  const ws = useRef(null);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const manualClose = useRef(false);
  const pingInterval = useRef(null);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN ||
        ws.current?.readyState === WebSocket.CONNECTING) return;

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/ws`;

    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      reconnectDelay.current = 1000;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      // Keep connection alive through Cloudflare Tunnel / NAT
      if (pingInterval.current) clearInterval(pingInterval.current);
      pingInterval.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 20000);
    };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMessageRef.current?.(msg);
      } catch {}
    };

    socket.onclose = () => {
      setConnected(false);
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = null;
      }
      if (manualClose.current) return;
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 10000);
        connect();
      }, reconnectDelay.current);
    };

    socket.onerror = () => socket.close();
  }, []);

  useEffect(() => {
    manualClose.current = false;
    connect();
    return () => {
      manualClose.current = true;
      if (pingInterval.current) clearInterval(pingInterval.current);
      ws.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const send = useCallback((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected };
}
