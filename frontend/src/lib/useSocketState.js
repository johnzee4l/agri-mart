import { useEffect, useState } from "react";

import { onSocketState } from "./socket.js";

/* The chat panels show whether the live channel is up, so "Sent" is not confused with
   "delivered". Falls back to "disconnected" when the socket never loads (blocked
   WebSocket, signed-out tab), where the REST fallback still carries the message. */
export function useSocketState() {
  const [state, setState] = useState("connecting");

  useEffect(() => onSocketState(setState), []);

  return state;
}
