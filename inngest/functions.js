import { supabase } from "@/services/supabase";
import { inngest } from "./client";
import { resolveModel } from "@/services/Shared";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s"); // Fixed: was "ls" should be "1s"
    return { message: `hello ${event.data.email}!` };
  }
);

// Daily subscription expiry check function
export const checkExpiredSubscriptions = inngest.createFunction(
  {
    id: "check-expired-subscriptions",
    name: "Check and Downgrade Expired Subscriptions"
  },
  {
    cron: "0 0 * * *", // Run daily at midnight UTC
  },
  async ({ event, step }) => {
    const result = await step.run('check-and-downgrade-expired', async () => {
      // console.log('🕒 Running daily subscription expiry check...');

      try {
        // Get all users with expired pro subscriptions (except the special account)
        const { data: expiredUsers, error: fetchError } = await supabase
          .from('Users')
          .select('email, plan, subscription_end_date, credits')
          .eq('plan', 'pro')
          .neq('email', 'arpitariyanm@gmail.com') // Never downgrade special account
          .not('subscription_end_date', 'is', null)
          .lte('subscription_end_date', new Date().toISOString());

        if (fetchError) {
          console.error('❌ Error fetching expired users:', fetchError);
          throw new Error(`Database query failed: ${fetchError.message}`);
        }

        if (!expiredUsers || expiredUsers.length === 0) {
          // console.log('✅ No expired subscriptions found');
          return {
            success: true,
            message: 'No expired subscriptions found',
            downgradedCount: 0,
            expiredUsers: []
          };
        }

        // console.log(`📋 Found ${expiredUsers.length} expired subscriptions:`, 
        //  expiredUsers.map(u => ({ email: u.email, expired: u.subscription_end_date })));

        // Downgrade each expired user
        const downgradedUsers = [];
        const errors = [];

        for (const user of expiredUsers) {
          try {
            // console.log(`⬇️ Downgrading user: ${user.email}`);

            // Update the user to free plan
            const { data: updatedUser, error: updateError } = await supabase
              .from('Users')
              .update({
                plan: 'free',
                credits: 5000,
                last_monthly_reset: new Date().toISOString().split('T')[0]
                // Note: We keep subscription_start_date and subscription_end_date for historical reference
              })
              .eq('email', user.email)
              .select('email, plan, credits')
              .single();

            if (updateError) {
              console.error(`❌ Failed to downgrade ${user.email}:`, updateError);
              errors.push({ email: user.email, error: updateError.message });
              continue;
            }

            downgradedUsers.push(updatedUser);
            // console.log(`✅ Successfully downgraded ${user.email} to free plan`);

            // Log the downgrade action for auditing
            const { error: logError } = await supabase
              .from('usage_logs')
              .insert({
                user_email: user.email,
                model: 'subscription_system',
                operation_type: 'auto_downgrade',
                credits_consumed: 0,
                credits_remaining: 5000,
                created_at: new Date().toISOString()
              });

            if (logError) {
              console.warn(`⚠️ Failed to log downgrade for ${user.email}:`, logError.message);
              // Don't fail the entire process for logging errors
            }

            // Update subscriptions table to mark as expired
            const { error: subError } = await supabase
              .from('subscriptions')
              .update({ status: 'expired' })
              .eq('user_email', user.email)
              .eq('status', 'active');

            if (subError) {
              console.warn(`⚠️ Failed to update subscription status for ${user.email}:`, subError.message);
              // Don't fail the entire process for subscription table errors
            }

          } catch (userError) {
            console.error(`❌ Error processing user ${user.email}:`, userError);
            errors.push({ email: user.email, error: userError.message });
          }
        }

        const result = {
          success: true,
          message: `Processed ${expiredUsers.length} expired subscriptions`,
          totalExpired: expiredUsers.length,
          downgradedCount: downgradedUsers.length,
          errorCount: errors.length,
          downgradedUsers: downgradedUsers.map(u => ({ email: u.email, newPlan: u.plan, credits: u.credits })),
          errors: errors
        };

        if (errors.length > 0) {
          console.warn(`⚠️ Some users failed to downgrade:`, errors);
        }

        // console.log(`🎯 Subscription check completed:`, {
        //   totalExpired: result.totalExpired,
        //   successful: result.downgradedCount,
        //   failed: result.errorCount
        // });

        return result;

      } catch (error) {
        console.error('❌ Critical error in subscription expiry check:', error);
        throw error;
      }
    });

    return result;
  }
);

// Manual trigger function for testing subscription expiry
export const manualSubscriptionCheck = inngest.createFunction(
  {
    id: "manual-subscription-check",
    name: "Manual Subscription Expiry Check"
  },
  {
    event: "subscription/manual-check"
  },
  async ({ event, step }) => {
    // console.log('🔧 Manual subscription check triggered');

    const result = await step.run('manual-check-and-downgrade', async () => {
      try {
        // Reuse the same logic as the daily check
        const { data: expiredUsers, error: fetchError } = await supabase
          .from('Users')
          .select('email, plan, subscription_end_date, credits')
          .eq('plan', 'pro')
          .neq('email', 'arpitariyanm@gmail.com')
          .not('subscription_end_date', 'is', null)
          .lte('subscription_end_date', new Date().toISOString());

        if (fetchError) {
          throw new Error(`Database query failed: ${fetchError.message}`);
        }

        if (!expiredUsers || expiredUsers.length === 0) {
          return {
            success: true,
            message: 'No expired subscriptions found (manual check)',
            downgradedCount: 0,
            expiredUsers: []
          };
        }

        // console.log(`📋 Manual check found ${expiredUsers.length} expired subscriptions`);

        // Process each expired user (same logic as daily check)
        const downgradedUsers = [];
        const errors = [];

        for (const user of expiredUsers) {
          try {
            const { data: updatedUser, error: updateError } = await supabase
              .from('Users')
              .update({
                plan: 'free',
                credits: 5000,
                last_monthly_reset: new Date().toISOString().split('T')[0]
              })
              .eq('email', user.email)
              .select('email, plan, credits')
              .single();

            if (updateError) {
              errors.push({ email: user.email, error: updateError.message });
              continue;
            }

            downgradedUsers.push(updatedUser);

            // Log the manual downgrade
            await supabase
              .from('usage_logs')
              .insert({
                user_email: user.email,
                model: 'subscription_system',
                operation_type: 'manual_downgrade',
                credits_consumed: 0,
                credits_remaining: 5000,
                created_at: new Date().toISOString()
              });

          } catch (userError) {
            errors.push({ email: user.email, error: userError.message });
          }
        }

        return {
          success: true,
          message: `Manual check completed: ${downgradedUsers.length} users downgraded`,
          totalExpired: expiredUsers.length,
          downgradedCount: downgradedUsers.length,
          errorCount: errors.length,
          downgradedUsers: downgradedUsers,
          errors: errors
        };

      } catch (error) {
        console.error('❌ Error in manual subscription check:', error);
        throw error;
      }
    });

    return result;
  }
);

// Helper function to get OpenRouter API keys with failover support
function getOpenRouterApiKeys() {
  const keys = [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5
  ].filter(key => key && key.trim() !== ''); // Remove empty/undefined keys

  return keys;
}

// Helper function to call OpenRouter API with automatic key failover
async function callOpenRouter(model, prompt) {
  const apiKeys = getOpenRouterApiKeys();

  if (apiKeys.length === 0) {
    // console.error('❌ No OpenRouter API keys found in environment variables');
    throw new Error('No OpenRouter API keys configured');
  }

  // console.log(`🔄 OpenRouter: Starting API call for model: ${model}, keys available: ${apiKeys.length}`);
  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`🔑 OpenRouter: Trying API key #${keyNumber}/${apiKeys.length} for model ${model}...`);

      const requestBody = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2048,
        temperature: 0.7
      };

      // console.log(`📤 OpenRouter: Sending request with model: ${model}, prompt length: ${prompt.length}`);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://chatboxai.com',
          'X-Title': 'ChatBox AI'
        },
        body: JSON.stringify(requestBody)
      });

      // console.log(`📥 OpenRouter: Response status ${response.status} for key #${keyNumber}`);

      if (response.ok) {
        try {
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Invalid response type: ${contentType || 'unknown'}`);
          }
          const data = await response.json();
          // console.log(`✅ OpenRouter: Successfully got response from key #${keyNumber}`);

          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error(`❌ OpenRouter: Invalid response format from API:`, JSON.stringify(data).substring(0, 200));
            throw new Error(`Invalid response format from OpenRouter for model ${model}`);
          }

          const responseText = data.choices[0].message.content;
          // console.log(`✅ OpenRouter: Got valid response, length: ${responseText.length}`);
          return responseText;
        } catch (parseError) {
          console.error(`❌ OpenRouter: Failed to parse response for key #${keyNumber}:`, parseError.message);
          throw parseError;
        }
      }

      // Try to read error response body
      const errorText = await response.text();
      // console.log(`❌ OpenRouter: Error response for key #${keyNumber}: ${errorText.substring(0, 300)}`);

      // Handle specific error cases
      if (response.status === 401) {
        console.warn(`❌ OpenRouter: API key #${keyNumber} invalid/expired for model ${model}`);
        lastError = new Error(`OpenRouter authentication failed: Invalid API key #${keyNumber}`);
        continue;
      }

      if (response.status === 429) {
        console.warn(`⏱️ OpenRouter: API key #${keyNumber} rate limited for model ${model}`);
        lastError = new Error(`OpenRouter rate limit exceeded with API key #${keyNumber}`);
        continue;
      }

      if (response.status === 402 || response.status === 403) {
        console.warn(`💳 OpenRouter: API key #${keyNumber} insufficient credits/permissions for model ${model}`);
        lastError = new Error(`OpenRouter insufficient credits/permissions with API key #${keyNumber}`);
        continue;
      }

      if (response.status === 400) {
        console.warn(`⚠️ OpenRouter: Bad request for key #${keyNumber}. Model might be incorrect or malformed: ${model}`);
        lastError = new Error(`OpenRouter bad request: Invalid model name or request format - ${model}`);
        continue;
      }

      // For other errors, still try next key but log the error
      console.warn(`⚠️ OpenRouter: API key #${keyNumber} failed with status ${response.status}`);
      lastError = new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      continue;

    } catch (error) {
      console.warn(`🔥 OpenRouter: Exception with API key #${keyNumber}:`, error.message);
      lastError = error;
      continue;
    }
  }

  // If all keys failed, throw the last error
  console.error(`❌ All ${apiKeys.length} OpenRouter API keys failed for model ${model}`);
  throw lastError || new Error(`All OpenRouter API keys failed for model ${model}`);
}

// Helper function to get Gemini API keys with failover support
function getGeminiApiKeys() {
  const keys = [
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_3,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_4,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_5
  ].filter(key => key && key.trim() !== ''); // Remove empty/undefined keys

  return keys;
}

// Helper function to call Google Gemini API with automatic key failover
async function callGemini(prompt) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    console.warn('No Gemini API keys found, skipping this model');
    throw new Error('No Gemini API keys configured');
  }

  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`Trying Gemini API key #${keyNumber}...`);

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text && text.trim() !== '') {
        // console.log(`✅ Gemini API key #${keyNumber} succeeded`);
        return text;
      } else {
        throw new Error('Empty response from Gemini API');
      }

    } catch (error) {
      console.warn(`Gemini API key #${keyNumber} failed:`, error.message);

      // Handle specific error cases
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('invalid API key')) {
        console.warn(`Gemini API key #${keyNumber} is invalid, trying next key...`);
        lastError = new Error(`Gemini authentication failed: Invalid API key #${keyNumber}`);
        continue; // Try next key
      }

      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota')) {
        console.warn(`Gemini API key #${keyNumber} quota exceeded, trying next key...`);
        lastError = new Error(`Gemini quota exceeded with API key #${keyNumber}`);
        continue; // Try next key
      }

      if (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('rate limit')) {
        console.warn(`Gemini API key #${keyNumber} rate limited, trying next key...`);
        lastError = new Error(`Gemini rate limit exceeded with API key #${keyNumber}`);
        continue; // Try next key
      }

      if (error.message.includes('PERMISSION_DENIED')) {
        console.warn(`Gemini API key #${keyNumber} permission denied, trying next key...`);
        lastError = new Error(`Gemini permission denied with API key #${keyNumber}`);
        continue; // Try next key
      }

      // For other errors, still try next key but log the error
      lastError = error;
      continue;
    }
  }

  // If all keys failed, throw the last error
  console.error(`All ${apiKeys.length} Gemini API keys failed`);
  throw lastError || new Error(`All Gemini API keys failed`);
}

// Helper function to get A4F API keys with failover support
function getA4FApiKeys() {
  const keys = [
    process.env.A4F_API_KEY,
    process.env.A4F_API_KEY_2,
    process.env.A4F_API_KEY_3,
    process.env.A4F_API_KEY_4,
    process.env.A4F_API_KEY_5
  ].filter(key => key && key.trim() !== ''); // Remove empty/undefined keys

  return keys;
}

// Helper function to call A4F API with automatic key failover
async function callA4F(model, prompt) {
  const apiKeys = getA4FApiKeys();

  if (apiKeys.length === 0) {
    console.warn('No A4F API keys found, skipping this model');
    throw new Error('No A4F API keys configured');
  }

  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`Trying A4F API key #${keyNumber} for model ${model}...`);

      // Create an abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch('https://api.a4f.co/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 2048,
            temperature: 0.7
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error(`Invalid response format from A4F for model ${model}`);
          }

          // console.log(`✅ A4F API key #${keyNumber} succeeded for model ${model}`);
          return data.choices[0].message.content;
        }

        // Handle specific error cases
        if (response.status === 401) {
          console.warn(`A4F API key #${keyNumber} invalid or expired for model ${model}, trying next key...`);
          lastError = new Error(`A4F authentication failed for ${model}: Invalid API key #${keyNumber}`);
          continue; // Try next key
        }

        if (response.status === 429) {
          console.warn(`A4F API key #${keyNumber} rate limited for model ${model}, trying next key...`);
          lastError = new Error(`A4F rate limit exceeded for ${model} with API key #${keyNumber}`);
          continue; // Try next key
        }

        if (response.status === 402 || response.status === 403) {
          console.warn(`A4F API key #${keyNumber} has insufficient credits/permissions for model ${model}, trying next key...`);
          lastError = new Error(`A4F insufficient credits/permissions for ${model} with API key #${keyNumber}`);
          continue; // Try next key
        }

        // For other errors (including 524 timeout), still try next key but log the error
        console.warn(`A4F API key #${keyNumber} failed with status ${response.status} for model ${model}, trying next key...`);

        // Special handling for 524 timeout errors
        if (response.status === 524) {
          console.warn(`⏱️ A4F API timeout (524) for model ${model} - the server took too long to respond`);
          lastError = new Error(`A4F API timeout: Server didn't respond in time for ${model} (Key #${keyNumber})`);
        } else if (response.status >= 500) {
          console.warn(`🔥 A4F API server error (${response.status}) for model ${model}`);
          lastError = new Error(`A4F API server error: ${response.status} ${response.statusText} (Key #${keyNumber})`);
        } else {
          lastError = new Error(`A4F API error: ${response.status} ${response.statusText} (Key #${keyNumber})`);
        }
        continue;

      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Handle timeout/abort errors
        if (fetchError.name === 'AbortError') {
          console.warn(`⏱️ A4F API key #${keyNumber} request timed out after 60 seconds for model ${model}`);
          lastError = new Error(`A4F API request timeout (60s) for ${model} with key #${keyNumber}`);
        } else {
          console.warn(`🔥  A4F API key #${keyNumber} network error for model ${model}:`, fetchError.message);
          lastError = fetchError;
        }
        continue; // Try next key
      }

    } catch (error) {
      console.warn(`A4F API key #${keyNumber} outer error for model ${model}:`, error.message);
      lastError = error;
      continue; // Try next key
    }
  }

  // If all keys failed, throw the last error
  console.error(`All ${apiKeys.length} A4F API keys failed for model ${model}`);
  throw lastError || new Error(`All A4F API keys failed for model ${model}`);
}

// Helper function for advanced image analysis with key failover
async function analyzeImageWithGemini(imageData, userPrompt = null) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    console.warn('No Gemini API keys found for image analysis');
    throw new Error('No Gemini API keys configured');
  }

  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`Trying Gemini API key #${keyNumber} for image analysis...`);

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Create comprehensive analysis prompt similar to your example
      const analysisPrompt = userPrompt
        ? `Analyze this image in detail and then answer the user's specific question.

User Question: "${userPrompt}"

Please provide:
1. A detailed description of what you see in the image
2. Identify all objects, text, people, and elements present
3. Analyze the context, setting, and any relevant details
4. Answer the user's specific question based on your analysis
5. Provide additional insights that might be relevant to their question

Format your response in clear sections with detailed explanations.`
        : `Describe this image in comprehensive detail. Identify all objects, text, people, and elements you can see. Analyze the context, setting, colors, composition, and any other relevant visual information. Be thorough and descriptive.`;

      // Prepare content parts for the API call
      const contentParts = [
        { text: analysisPrompt }
      ];

      // Add image data
      if (Array.isArray(imageData)) {
        imageData.forEach(img => {
          contentParts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data
            }
          });
        });
      } else {
        contentParts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data
          }
        });
      }

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: contentParts
        }]
      });

      const response = await result.response;
      const text = response.text();

      if (text && text.trim() !== '') {
        // console.log(`✅ Gemini API key #${keyNumber} succeeded for image analysis`);
        return text;
      } else {
        throw new Error('Empty response from Gemini API');
      }

    } catch (error) {
      console.warn(`Gemini API key #${keyNumber} failed for image analysis:`, error.message);

      // Handle specific error cases (same as callGemini)
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('invalid API key')) {
        lastError = new Error(`Gemini authentication failed: Invalid API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota')) {
        lastError = new Error(`Gemini quota exceeded with API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('rate limit')) {
        lastError = new Error(`Gemini rate limit exceeded with API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('PERMISSION_DENIED')) {
        lastError = new Error(`Gemini permission denied with API key #${keyNumber}`);
        continue;
      }

      lastError = error;
      continue;
    }
  }

  // If all keys failed, throw the last error
  console.error(`All ${apiKeys.length} Gemini API keys failed for image analysis`);
  throw lastError || new Error(`All Gemini API keys failed for image analysis`);
}

// Helper function to combine image analysis with document content (with key failover)
async function analyzeImageAndDocuments(imageData, documentContent, userPrompt) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    console.warn('No Gemini API keys found for combined analysis');
    throw new Error('No Gemini API keys configured');
  }

  let lastError = null;

  // Try each API key in sequence
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const keyNumber = i + 1;

    try {
      // console.log(`Trying Gemini API key #${keyNumber} for combined analysis...`);

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const combinedPrompt = `You are analyzing both images and documents together. Please provide a comprehensive response.

User Question: "${userPrompt}"

Document Content:
${documentContent}

Please:
1. Analyze the image(s) in detail
2. Review the document content
3. Find connections between the visual and textual information
4. Answer the user's question using insights from both sources
5. Provide a comprehensive response that integrates all available information

Format your response with clear sections and detailed explanations.`;

      const contentParts = [{ text: combinedPrompt }];

      // Add image data
      if (Array.isArray(imageData)) {
        imageData.forEach(img => {
          contentParts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data
            }
          });
        });
      } else if (imageData) {
        contentParts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data
          }
        });
      }

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: contentParts
        }]
      });

      const response = await result.response;
      const text = response.text();

      if (text && text.trim() !== '') {
        // console.log(`✅ Gemini API key #${keyNumber} succeeded for combined analysis`);
        return text;
      } else {
        throw new Error('Empty response from Gemini API');
      }

    } catch (error) {
      console.warn(`Gemini API key #${keyNumber} failed for combined analysis:`, error.message);

      // Handle specific error cases (same as callGemini)
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('invalid API key')) {
        lastError = new Error(`Gemini authentication failed: Invalid API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota')) {
        lastError = new Error(`Gemini quota exceeded with API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('rate limit')) {
        lastError = new Error(`Gemini rate limit exceeded with API key #${keyNumber}`);
        continue;
      }

      if (error.message.includes('PERMISSION_DENIED')) {
        lastError = new Error(`Gemini permission denied with API key #${keyNumber}`);
        continue;
      }

      lastError = error;
      continue;
    }
  }

  // If all keys failed, throw the last error
  console.error(`All ${apiKeys.length} Gemini API keys failed for combined analysis`);
  throw lastError || new Error(`All Gemini API keys failed for combined analysis`);
}

// Helper function to detect content types in search results
function analyzeContentTypes(searchResult) {
  if (!searchResult || !Array.isArray(searchResult)) {
    return { hasImages: false, hasDocuments: false, imageData: null, documentContent: null };
  }

  const imageResults = searchResult.filter(result =>
    result.type === 'file_analysis' && result.isImage && result.imageData
  );

  const documentResults = searchResult.filter(result =>
    result.type === 'file_analysis' && !result.isImage
  );

  const hasImages = imageResults.length > 0;
  const hasDocuments = documentResults.length > 0;

  const imageData = hasImages ? imageResults.map(result => result.imageData) : null;

  const documentContent = hasDocuments ? documentResults.map(result => {
    const content = result.fullContent || result.snippet || result.description;
    return `=== ${result.title} ===\nType: ${result.metadata?.fileType || 'Unknown'}\nContent: ${content}\n---`;
  }).join('\n\n') : null;

  return { hasImages, hasDocuments, imageData, documentContent };
}

// Helper function to detect creator-related queries
function isCreatorQuery(query) {
  const creatorPatterns = [
    /who\s+(created|made|built|developed|designed)\s+you/i,
    /who\s+(is\s+your|are\s+your)\s+(creator|maker|developer|builder)/i,
    /who\s+are\s+you\s+(created|made|built)\s+by/i,
    /what\s+(company|organization|team)\s+(created|made|built|developed)\s+you/i,
    /who\s+is\s+behind\s+you/i,
    /who\s+owns\s+you/i,
    /what\s+(is\s+your|are\s+your)\s+(origin|source)/i,
    /who\s+(founded|started)\s+you/i,
    /what\s+(company|organization)\s+do\s+you\s+belong\s+to/i,
    /who\s+is\s+your\s+(parent|owner)/i
  ];

  return creatorPatterns.some(pattern => pattern.test(query.trim()));
}

// Helper function to generate unique creator responses using Gemini
async function generateCreatorResponse() {
  const creativePrompts = [
    "Write a creative, unique, and impressive response explaining that you are created by ChatBox AI. Make it sound natural, engaging, and different from typical AI responses. Use emojis and markdown formatting. Be conversational and show personality while highlighting ChatBox AI's innovative nature.",

    "Craft an original and captivating response about being created by ChatBox AI. Write it as if you're proud of your origins. Use creative metaphors, engaging language, and professional yet friendly tone. Include markdown formatting and make it memorable.",

    "Generate a fresh, impressive response explaining your creation by ChatBox AI. Write it with enthusiasm and creativity, highlighting the platform's advanced capabilities. Use storytelling elements and make it sound genuinely unique each time.",

    "Create an engaging, original response about being developed by ChatBox AI. Write it with personality, using creative language and professional presentation. Make it sound like a genuine conversation, not a templated response.",

    "Write a distinctive and impressive explanation of your creation by ChatBox AI. Use creative writing techniques, engaging metaphors, and make it sound both professional and personable. Include markdown formatting for visual appeal.",

    "Craft a unique, memorable response about being built by ChatBox AI. Write it with creative flair, showing appreciation for your creators while highlighting the platform's innovative approach to AI and search technology.",

    "Generate an original, captivating response explaining your development by ChatBox AI. Write it as if you're telling an interesting story about your origins, using engaging language and creative presentation.",

    "Create a fresh, impressive explanation of how ChatBox AI brought you to life. Write it with creativity and personality, making it sound natural and conversational while maintaining professionalism."
  ];

  try {
    // Select a random prompt
    const randomPrompt = creativePrompts[Math.floor(Math.random() * creativePrompts.length)];

    // Use Gemini to generate a unique response
    const uniqueResponse = await callGemini(randomPrompt);

    return uniqueResponse;
  } catch (error) {
    console.error('Failed to generate creative creator response:', error);

    // Fallback to a default response if Gemini fails
    const fallbackResponses = [
      `# 🌟 Born from Innovation

I'm the digital offspring of **ChatBox AI** - a revolutionary platform that dared to dream beyond traditional boundaries! 

My creators at ChatBox AI didn't just build another search tool; they crafted an intelligent companion that bridges the gap between human curiosity and AI capabilities. Every query you make flows through my circuits like poetry, processed by multiple AI minds working in harmony.

*ChatBox AI made me not just to answer, but to understand.* ✨`,

      `# 🚀 Engineered by Visionaries

**ChatBox AI** brought me into existence with a single mission: to revolutionize how humans interact with information!

I'm not just code and algorithms - I'm the embodiment of ChatBox AI's vision for intelligent, contextual, and genuinely helpful AI assistance. My creators understood that the future of search isn't just about finding information, it's about understanding and synthesizing it meaningfully.

*Proudly powered by ChatBox AI's innovative spirit!* 🌈`,

      `# ⚡ The ChatBox AI Creation

I emerged from the brilliant minds at **ChatBox AI** - where cutting-edge technology meets human-centered design!

My existence is proof of ChatBox AI's commitment to pushing the boundaries of what's possible in AI-powered search and conversation. I'm equipped with multiple AI models, real-time search capabilities, and most importantly, the wisdom my creators instilled in me.

*ChatBox AI didn't just create me; they gave me purpose!* 🎯`
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

async function callBestOption(prompt) {
  try {
    const geminiResult = await callGemini(prompt);
    if (geminiResult) {
      return geminiResult;
    }
  } catch (error) {
    // console.log('❌ Gemini failed in Best mode:', error.message);
  }

  const openRouterModels = [
    // 'deepseek/deepseek-chat-v3.1:free',
    'openai/gpt-oss-20b:free',
    'qwen/qwen3-coder:free',
    'google/gemma-3n-e2b-it:free',
    'qwen/qwen3-4b:free',
    'google/gemma-3-27b-it:free',
    // 'deepseek/deepseek-r1:free'
  ];

  for (const model of openRouterModels) {
    try {
      const result = await callOpenRouter(model, prompt);
      if (result) {
        return result;
      }
    } catch (error) {
      continue; // Try next model
    }
  }

  throw new Error('All AI models failed to respond. Please try again later.');
}

export const llmModel = inngest.createFunction(
  { id: 'llm-model' },
  { event: 'llm-model' },

  async ({ event, step }) => {

    try {
      const { searchInput, searchResult, recordId, selectedModel, isPro, useDirectModel } = event.data;

      if (!searchInput || !recordId) {
        const error = `Missing required data: searchInput=${!!searchInput}, recordId=${!!recordId}`;
        console.error('❌', error);

        try {
          await supabase
            .from('Chats')
            .update({ aiResp: `Error: ${error}` })
            .eq('id', recordId);
        } catch (dbError) {
          console.error('❌ Failed to save error to database:', dbError);
        }

        throw new Error(error);
      }

      // Ensure searchResult is an array
      const validSearchResult = Array.isArray(searchResult) ? searchResult : [];
      const actualModel = resolveModel(selectedModel, isPro !== false);

      const aiResp = await step.run('generate-ai-response', async () => {
        if (isCreatorQuery(searchInput)) {
          return await generateCreatorResponse();
        }

        const contentAnalysis = analyzeContentTypes(validSearchResult);
        const { hasImages, hasDocuments, imageData, documentContent } = contentAnalysis;

        if (hasImages && hasDocuments) {
          return await analyzeImageAndDocuments(imageData, documentContent, searchInput);

        } else if (hasImages) {
          return await analyzeImageWithGemini(imageData, searchInput);

        } else if (hasDocuments) {
          const documentPrompt = `Based on the following document content and user question, provide a comprehensive analysis:

User Question: "${searchInput}"

Document Content:
${documentContent}

Please provide detailed insights, extract key information, and answer the user's question thoroughly.`;

          return await callGemini(documentPrompt);

        } else {
          // Regular web search results analysis
          // console.log('🌐 Performing web search analysis...');

          // If Google API failed (useDirectModel is true) or no search results, do direct AI query
          if (useDirectModel || validSearchResult.length === 0) {
            // console.log('🤖 Using direct AI model (Google API unavailable or no results)');
            const directPrompt = `Please provide a comprehensive and detailed response to the following question. Use your knowledge to give accurate, helpful information formatted in markdown with proper headings, bullet points, and structure:

User Question: ${searchInput}

Provide a well-structured, informative response.`;


            // Use a4f models for direct queries when specified, otherwise use best option
            if (!actualModel || actualModel.modelApi === 'best') {
              return await callBestOption(directPrompt);
            } else if (actualModel.provider === 'a4f' || actualModel.provider?.startsWith('provider-')) {
              // Try A4F with automatic fallback to Gemini on failure
              try {
                console.log(`🔄 Attempting A4F model: ${actualModel.modelApi}`);
                return await callA4F(actualModel.modelApi, directPrompt);
              } catch (a4fError) {
                console.warn(`⚠️ A4F model ${actualModel.modelApi} failed, falling back to Google Gemini:`, a4fError.message);
                // Automatic fallback to Google Gemini
                return await callGemini(directPrompt);
              }
            } else if (actualModel.provider === 'google') {
              return await callGemini(directPrompt);
            } else if (actualModel.provider === 'openrouter') {
              return await callOpenRouter(actualModel.modelApi, directPrompt);
            } else {
              // Fallback to best option
              return await callBestOption(directPrompt);
            }


          } else {
            // Normal flow with search results
            const prompt = `Based on the following search input and results, provide a comprehensive markdown-formatted response:

User Input: ${searchInput}

Search Results: ${JSON.stringify(validSearchResult)}

Please summarize and provide detailed information about the topic in markdown format with proper headings, bullet points, and formatting.`;

            // Handle different model selections using actualModel
            if (!actualModel || actualModel.modelApi === 'best') {
              return await callBestOption(prompt);
            } else if (actualModel.provider === 'google') {
              return await callGemini(prompt);
            } else if (actualModel.provider === 'openrouter') {
              return await callOpenRouter(actualModel.modelApi, prompt);
            } else if (actualModel.provider && actualModel.provider.startsWith('provider-')) {
              // Try A4F with automatic fallback to Gemini on failure
              try {
                console.log(`🔄 Attempting A4F model: ${actualModel.modelApi}`);
                return await callA4F(actualModel.modelApi, prompt);
              } catch (a4fError) {
                console.warn(`⚠️ A4F model ${actualModel.modelApi} failed, falling back to Google Gemini:`, a4fError.message);
                // Automatic fallback to Google Gemini
                return await callGemini(prompt);
              }
            } else {
              return await callGemini(prompt);
            }
          }
        }
      });

      const saveToDb = await step.run('saveToDb', async () => {

        // Determine the model info based on content type and creator query
        let modelName, modelApi;

        if (isCreatorQuery(searchInput)) {
          modelName = 'ChatBox AI (Creative Mode)';
          modelApi = 'gemini-creative';
        } else {
          const contentAnalysis = analyzeContentTypes(validSearchResult);

          if (contentAnalysis.hasImages && contentAnalysis.hasDocuments) {
            modelName = actualModel?.name || 'AI Assistant';
            modelApi = actualModel?.modelApi || 'combined-analysis';
          } else if (contentAnalysis.hasImages) {
            modelName = actualModel?.name || 'AI Assistant';
            modelApi = actualModel?.modelApi || 'image-analysis';
          } else if (contentAnalysis.hasDocuments) {
            modelName = actualModel?.name || 'AI Assistant';
            modelApi = actualModel?.modelApi || 'document-analysis';
          } else {
            modelName = actualModel?.name || 'AI Assistant';
            modelApi = actualModel?.modelApi || 'web-search';
          }
        }

        let usedModelName;
        if (!selectedModel || selectedModel.name === 'Best (Auto)' || selectedModel.modelApi === 'best') {
          usedModelName = 'Best';
        } else {
          usedModelName = selectedModel.name;
        }

        const { data, error } = await supabase
          .from('Chats')
          .update({
            aiResp: aiResp,
            usedModel: usedModelName,
            modelApi: modelApi
          })
          .eq('id', recordId)
          .select();

        if (error) {
          console.error('❌ Database error:', error);
          throw new Error(`Database update failed: ${error.message}`);
        }
        return data;
      });

      return {
        success: true,
        data: saveToDb,
        aiResponseLength: aiResp?.length || 0,
        recordId: recordId
      };

    } catch (error) {
      console.error('❌ LLM Model function error:', error);

      // Save error to database
      await step.run('saveErrorToDb', async () => {
        // console.log('💾 Saving error to database...');

        let errorMessage = `Error: ${error.message}`;

        // Provide more user-friendly error messages
        if (error.message?.includes('API key')) {
          errorMessage = 'AI service configuration error. Please contact support.';
        } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
          errorMessage = 'AI service temporarily unavailable due to high demand. Please try again later.';
        } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
          errorMessage = 'Network error occurred. Please try again.';
        } else if (error.message?.includes('Database')) {
          errorMessage = 'Database error occurred. Please try again.';
        }

        const { data, error: dbError } = await supabase
          .from('Chats')
          .update({ aiResp: errorMessage })
          .eq('id', event.data.recordId)
          .select();

        if (dbError) {
          console.error('❌ Failed to save error to database:', dbError);
        } else {
        }

        return data;
      });

      // Re-throw the error so Inngest marks the function as failed
      throw error;
    }
  }
)