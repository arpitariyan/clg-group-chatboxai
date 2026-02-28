import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
    helloWorld, 
    llmModel, 
    checkExpiredSubscriptions, 
    manualSubscriptionCheck 
} from "@/inngest/functions";

// console.log('Initializing Inngest API route...');

// Validate environment
const isDevelopment = process.env.NODE_ENV === 'development';
const signingKey = isDevelopment 
    ? "signkey-test-12345678901234567890123456789012" 
    : process.env.INNGEST_SIGNING_KEY;

if (!isDevelopment && !signingKey) {
    console.error('INNGEST_SIGNING_KEY is required for production');
}

const createErrorHandler = (error) => async (req) => {
    return new Response(JSON.stringify({ 
        error: 'Inngest initialization failed',
        details: error.message 
    }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
};

// Create the serve handler with proper development configuration
let GET, POST, PUT;

try {
    const handlers = serve({
        client: inngest,
        functions: [
            helloWorld,
            llmModel,
            checkExpiredSubscriptions,
            manualSubscriptionCheck
        ],
        signingKey: signingKey,
        // Set log level to info to hide debug messages
        logLevel: "info",
        // Serve configuration for Next.js
        serveHost: isDevelopment ? "http://localhost:3000" : undefined,
        servePath: "/api/inngest"
    });

    GET = handlers.GET;
    POST = handlers.POST;
    PUT = handlers.PUT;

    // console.log('Inngest handlers created successfully');
    
} catch (error) {
    console.error('Failed to initialize Inngest handlers:', error);
    
    const errorHandler = createErrorHandler(error);
    GET = errorHandler;
    POST = errorHandler;
    PUT = errorHandler;
}

// Export the handlers
export { GET, POST, PUT };