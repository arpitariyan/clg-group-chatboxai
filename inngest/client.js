import { Inngest } from "inngest";

export const inngest = new Inngest({ 
  id: "chatbox-ai",
  name: "ChatBox AI",
  // Add development mode configuration
  isDev: process.env.NODE_ENV === 'development',
  // Set the event key for development
  eventKey: process.env.INNGEST_EVENT_KEY || undefined
});