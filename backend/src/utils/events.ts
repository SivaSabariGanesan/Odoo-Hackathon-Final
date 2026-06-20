// ─── Event client wrapper ─────────────────────────────────────────────────────
// Siva owns the WebSocket/Socket.IO transport layer.
// This module provides the emit() interface that Giri's logic calls.
// When Siva ships his event client, replace the stub below with his import.
//
// Convention: every event payload includes an `at` ISO timestamp.

export type EventName =
  | "order_state_changed"
  | "kds_ticket_pushed"
  | "kds_item_mutated"
  | "category_color_updated"
  | "order_completed"
  | "table_occupancy_changed";

export interface EventPayload {
  event: EventName;
  at: string;
  [key: string]: unknown;
}

// Siva's emit wrapper — resolved at runtime from his module once shipped.
// Falls back to a no-op console log so our code compiles and runs before
// the transport layer is integrated.
let _emit: ((payload: EventPayload) => void) | null = null;

/**
 * Register Siva's emit function once his module initialises.
 * Call this from the app bootstrap (src/index.ts) after Siva's server
 * is ready: `registerEmitter(sivaEventClient.emit.bind(sivaEventClient))`
 */
export function registerEmitter(fn: (payload: EventPayload) => void) {
  _emit = fn;
}

/**
 * Emit a real-time event. Falls back to a structured console log when
 * Siva's transport layer is not yet wired up.
 */
export function emit(name: EventName, payload: Omit<EventPayload, "event" | "at">) {
  const full: EventPayload = { event: name, at: new Date().toISOString(), ...payload };
  if (_emit) {
    _emit(full);
  } else {
    console.log("[events][stub]", JSON.stringify(full));
  }
}
