import { Inngest } from "inngest";

const isProduction = process.env.NODE_ENV === 'production';
const configuredInngestBaseUrl = process.env.INNGEST_BASE_URL;

const inngestConfig = {
  id: "chatbox-ai",
  name: "ChatBox AI",
  // Signing key for webhook verification
  signingKey: process.env.INNGEST_SIGNING_KEY || undefined,
  // Event key for authentication
  eventKey: process.env.INNGEST_EVENT_KEY || undefined,
};

// In development, default to local dev server for convenience.
// In production, only set baseUrl when explicitly provided.
if (configuredInngestBaseUrl) {
  inngestConfig.baseUrl = configuredInngestBaseUrl;
} else if (!isProduction) {
  inngestConfig.baseUrl = 'http://localhost:8288';
}

export const inngest = new Inngest(inngestConfig);