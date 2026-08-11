import { randomUUID } from "node:crypto";

/** Generates a unique identifier for a domain entity. */
export function newId(): string {
  return randomUUID();
}
