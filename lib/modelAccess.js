// Model access configuration for Free and Pro plans
export const MODEL_ACCESS = {
  free: [
    "provider-8/gemini-2.0-flash",
    "provider-5/gemini-2.5-flash-lite",
    "provider-6/qwen3-32b",
    "provider-2/deepseek-v3",
    "provider-2/deepseek-v3.1",
    "provider-8/llama-4-scout"
  ],
  pro: "all" // Pro users can access all models
};

// Credit costs per operation
export const OPERATION_COSTS = {
  free: 15, // Fixed cost for free users
  pro: {
    // Variable costs for pro users based on model
    "provider-8/gemini-2.0-flash": 10,
    "provider-5/gemini-2.5-flash-lite": 8,
    "provider-6/qwen3-32b": 12,
    "provider-2/deepseek-v3": 15,
    "provider-2/deepseek-v3.1": 16,
    "provider-8/llama-4-scout": 12,
    "provider-5/gpt-5-nano": 20,
    "provider-5/gpt-4o-mini": 18,
    "provider-5/gpt-4.1-nano": 16,
    "provider-5/gpt-4.1-mini": 17,
    "provider-3/llama-3.2-3b": 10,
    "provider-2/qwen3-1.7b": 8,
    "provider-1/llama-4-maverick-17b-128e-instruct": 22,
    default: 10 // Default cost for unspecified models
  }
};

// Plan limits and features
export const PLAN_FEATURES = {
  free: {
    monthlyCredits: 5000,
    dailyLimit: false,
    modelAccess: MODEL_ACCESS.free,
    features: [
      "5,000 monthly credits",
      "15 credits per generation/search",
      "Access to free models only",
      "Standard support"
    ]
  },
  pro: {
    monthlyCredits: 25000,
    dailyLimit: false,
    modelAccess: MODEL_ACCESS.pro,
    features: [
      "25,000 monthly credits",
      "Variable credit cost per model",
      "Access to all AI models including premium",
      "Priority support",
      "Advanced features"
    ]
  }
};

// Helper function to check if user can access model
export const canAccessModel = (userPlan, modelApi) => {
  if (userPlan === 'pro') {
    return true; // Pro users can access all models
  }

  // Free users can only access models in the free list
  return MODEL_ACCESS.free?.includes(modelApi) || false;
};

// Helper function to get operation cost
export const getOperationCost = (userPlan, modelApi = null) => {
  if (userPlan === 'free') {
    return OPERATION_COSTS.free;
  }

  if (userPlan === 'pro') {
    return OPERATION_COSTS.pro[modelApi] || OPERATION_COSTS.pro.default;
  }

  return OPERATION_COSTS.free; // Default to free cost
};