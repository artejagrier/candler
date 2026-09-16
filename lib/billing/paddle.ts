import "server-only";
import { Paddle } from "@paddle/paddle-node-sdk";

export function paddleClient() {
  if (!process.env.PADDLE_API_KEY) throw new Error("Billing is not configured.");
  return new Paddle(process.env.PADDLE_API_KEY);
}
