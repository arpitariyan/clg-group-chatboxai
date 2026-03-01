import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { 
    helloWorld, 
    llmModel, 
    checkExpiredSubscriptions, 
    manualSubscriptionCheck 
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        helloWorld,
        llmModel,
        checkExpiredSubscriptions,
        manualSubscriptionCheck
    ],
});