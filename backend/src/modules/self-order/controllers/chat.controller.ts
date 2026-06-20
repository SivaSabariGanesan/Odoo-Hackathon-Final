import { Context } from "hono";
import { ChatService } from "../services/chat.service.ts";
import { ChatRequestSchema } from "../validators/chat.validator.ts";

const chatService = new ChatService();

export async function handleChatRequest(c: Context) {
  try {
    const body = await c.req.json();
    const result = ChatRequestSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({ success: false, error: "Invalid request payload", details: result.error.errors }, 400);
    }

    const { messages, newMsg } = result.data;
    
    // Call the service
    const responseText = await chatService.handleChat(messages, newMsg);

    return c.json({
      success: true,
      data: {
        response: responseText
      }
    });
  } catch (error) {
    console.error("[ChatController] Error:", error);
    // Even on controller failures, return 200 with fallback to avoid breaking UI strictly
    return c.json({
      success: true,
      data: {
        response: "I'm having trouble connecting right now. Please browse the menu directly to place your order!"
      }
    });
  }
}
