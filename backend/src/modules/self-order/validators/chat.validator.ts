import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(2000),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).max(20), // Cap history size
  newMsg: z.string().min(1).max(500),           // Cap incoming message length
});
