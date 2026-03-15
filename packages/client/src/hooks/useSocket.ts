import { useEffect, useCallback, useRef } from "react";
import { useSocketContext } from "../contexts/SocketContext";

type EventCallback<T = any> = (data: T) => void;

export function useSocket() {
  const { socket, isConnected, subscribe, unsubscribe } = useSocketContext();
  const listenersRef = useRef<Map<string, EventCallback>>(new Map());

  const on = useCallback(
    <T = any>(event: string, callback: EventCallback<T>) => {
      if (socket) {
        listenersRef.current.set(event, callback);
        socket.on(event, callback);
      }
    },
    [socket]
  );

  const off = useCallback(
    (event: string) => {
      if (socket) {
        const callback = listenersRef.current.get(event);
        if (callback) {
          socket.off(event, callback);
          listenersRef.current.delete(event);
        }
      }
    },
    [socket]
  );

  const emit = useCallback(
    (event: string, data?: any) => {
      if (socket) {
        socket.emit(event, data);
      }
    },
    [socket]
  );

  useEffect(() => {
    return () => {
      listenersRef.current.forEach((callback, event) => {
        socket?.off(event, callback);
      });
      listenersRef.current.clear();
    };
  }, [socket]);

  return {
    isConnected,
    subscribe,
    unsubscribe,
    on,
    off,
    emit,
    socket,
  };
}

export function useLLMStream(
  sessionId: string,
  onToken: (token: string, done: boolean, fullResponse?: string) => void
) {
  const { on, off, subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    subscribe(`chat:${sessionId}`);

    on("llm:token", (data: { sessionId: string; token: string; done: boolean; fullResponse?: string }) => {
      if (data.sessionId === sessionId) {
        onToken(data.token, data.done, data.fullResponse);
      }
    });

    return () => {
      off("llm:token");
      unsubscribe(`chat:${sessionId}`);
    };
  }, [sessionId, onToken, on, off, subscribe, unsubscribe]);
}

export function useMarketUpdates(
  onTick: (data: { symbol: string; price: number; change: number }) => void
) {
  const { on, off, subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    subscribe("market");

    on("market:tick", onTick);

    return () => {
      off("market:tick");
      unsubscribe("market");
    };
  }, [onTick, on, off, subscribe, unsubscribe]);
}

export function useRiskAlerts(
  onAlert: (data: { type: string; message: string; severity: string }) => void
) {
  const { on, off, subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    subscribe("risk");

    on("risk:alert", onAlert);

    return () => {
      off("risk:alert");
      unsubscribe("risk");
    };
  }, [onAlert, on, off, subscribe, unsubscribe]);
}

export function useSignalDetection(
  onSignal: (signal: any) => void
) {
  const { on, off, subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    subscribe("signals");

    on("signal:detected", onSignal);

    return () => {
      off("signal:detected");
      unsubscribe("signals");
    };
  }, [onSignal, on, off, subscribe, unsubscribe]);
}
