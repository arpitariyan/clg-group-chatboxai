export const AIModelsOption = [
    {
        id: 1,
        name: 'Auto',
        desc: 'Automatic Model Selection (Random from Available Models)',
        modelApi: 'auto',
        provider: 'mixed',
        isPro: false
    },
    // {
    //     id: 2,
    //     name: 'Llama 4 Maverick',
    //     desc: 'Meta Llama 4 Maverick - Advanced Intelligence',
    //     modelApi: 'provider-6/llama-4-maverick',
    //     provider: 'a4f',
    //     isPro: true // Pro plan only
    // },
    // {
    //     id: 3,
    //     name: 'Gemini 3 Flash',
    //     desc: 'Google Gemini 3 Flash - High Performance',
    //     modelApi: 'provider-5/gemini-2.5-flash-lite',
    //     provider: 'a4f',
    //     isPro: false // Free plan can use
    // },
    // {
    //     id: 4,
    //     name: 'DeepSeek V3',
    //     desc: 'DeepSeek V3 - Advanced Reasoning',
    //     modelApi: 'provider-2/deepseek-v3',
    //     provider: 'a4f',
    //     isPro: false // Free plan can use
    // },
    // {
    //     id: 5,
    //     name: 'Qwen3 32B',
    //     desc: 'Alibaba Qwen3 32B - High Performance',
    //     modelApi: 'provider-6/qwen3-32b',
    //     provider: 'a4f',
    //     isPro: false // Free plan can use
    // },
    // Removed DeepSeek V3.1 due to persistent 524 timeout errors from provider-2
    // {
    //     id: 6,
    //     name: 'DeepSeek V3.1',
    //     desc: 'DeepSeek V3.1 - Enhanced Capabilities',
    //     modelApi: 'provider-2/deepseek-v3.1',
    //     provider: 'a4f',
    //     isPro: false // Free plan can use
    // },
    // {
    //     id: 6,
    //     name: 'Llama 4 Scout',
    //     desc: 'Meta Llama 4 Scout - Intelligent Assistant',
    //     modelApi: 'provider-8/llama-4-scout',
    //     provider: 'a4f',
    //     isPro: false // Free plan can use
    // },
    // {
    //     id: 7,
    //     name: 'Gemini 3 pro',
    //     desc: 'Google Gemini 3 pro - Fast & Efficient',
    //     modelApi: 'provider-5/gemini-3-pro',
    //     provider: 'a4f',
    //     isPro: false // Free plan can use
    // },
    // {
    //     id: 8,
    //     name: 'Gemini 2.5 Pro Thinking',
    //     desc: 'Google Gemini 2.5 Pro Thinking - Advanced Capabilities',
    //     modelApi: 'provider-5/gemini-2.5-pro',
    //     provider: 'a4f',
    //     isPro: false // Free plan can use
    // },
    {
        id: 2,
        name: 'Gemini 2.5 Flash',
        desc: 'Google Gemini 2.5 Flash - Next-Gen Speed',
        modelApi: 'gemini-2.5-flash',
        provider: 'google',
        isPro: false // Free plan can use
    },
    {
        id: 3,
        name: 'Gemini 2.5 Pro',
        desc: 'Google Gemini 2.5 Pro - Premium Performance',
        modelApi: 'gemini-2.5-pro',
        provider: 'google',
        isPro: false // Free plan can use
    },
    // {
    //     id: 11,
    //     name: 'Gemini 2.0 Flash',
    //     desc: 'Google Gemini 2.0 Flash - Fast & Efficient',
    //     modelApi: 'provider-8/gemini-2.0-flash',
    //     provider: 'a4f',
    //     isPro: false // Free plan can use
    // },
    // {
    //     id: 12,
    //     name: 'GPT 4o Mini',
    //     desc: 'OpenAI GPT-4o Mini - Optimized Performance',
    //     modelApi: 'provider-8/gpt-4o-mini',
    //     provider: 'a4f',
    //     isPro: true // Pro plan only
    // },
    // {
    //     id: 13,
    //     name: 'Llama 3.2 3B',
    //     desc: 'Meta Llama 3.2 3B - Fast & Efficient',
    //     modelApi: 'provider-3/llama-3.2-3b',
    //     provider: 'a4f',
    //     isPro: true // Pro plan only
    // },
    // {
    //     id: 14,
    //     name: 'DeepSeek Terminus',
    //     desc: 'DeepSeek Terminus - Advanced Reasoning',
    //     modelApi: 'provider-8/deepseek-terminus',
    //     provider: 'a4f',
    //     isPro: true // Pro plan only
    // },
    // {
    //     id: 15,
    //     name: 'Kimi K2',
    //     desc: 'Kimi K2 - Advanced Reasoning',
    //     modelApi: 'provider-8/kimi-k2',
    //     provider: 'a4f',
    //     isPro: true // Pro plan only
    // },
    // {
    //     id: 16,
    //     name: 'Qwen3',
    //     desc: 'Qwen3 - Advanced Reasoning',
    //     modelApi: 'provider-2/qwen3-14b',
    //     provider: 'a4f',
    //     isPro: true // Pro plan only
    // },
    // {
    //     id: 17,
    //     name: 'Qwen3 Pro',
    //     desc: 'Qwen3 Pro - Advanced Reasoning',
    //     modelApi: 'provider-2/qwen3-32b',
    //     provider: 'a4f',
    //     isPro: true // Pro plan only
    // },
    {
        id: 4,
        name: 'Qwen3 VL 30B Thinking',
        desc: 'Qwen3 VL 30B A3B Thinking',
        modelApi: 'qwen/qwen3-vl-30b-a3b-thinking',
        provider: 'openrouter',
        isPro: true // Pro plan only
    },
    {
        id: 5,
        name: 'Llama 4 Scout',
        desc: 'Meta Llama 4 Scout',
        modelApi: 'meta-llama/llama-4-scout:free',
        provider: 'openrouter',
        isPro: false // Free plan can use
    },
    {
        id: 6,
        name: 'Qwen3 Coder',
        desc: 'Qwen3 Coder',
        modelApi: 'qwen/qwen3-coder:free',
        provider: 'openrouter',
        isPro: false // Free plan can use
    },
    {
        id: 7,
        name: 'GLM 4.5 Air',
        desc: 'Z.ai GLM 4.5 Air',
        modelApi: 'z-ai/glm-4.5-air:free',
        provider: 'openrouter',
        isPro: true // Free plan can use
    },
    {
        id: 8,
        name: 'Free Models Router',
        desc: 'OpenRouter Free Models Router',
        modelApi: 'openrouter/free',
        provider: 'openrouter',
        isPro: false
    },
    {
        id: 9,
        name: 'StepFun 3.5 Flash',
        desc: 'StepFun 3.5 Flash',
        modelApi: 'stepfun/step-3.5-flash:free',
        provider: 'openrouter',
        isPro: true
    },
    {
        id: 10,
        name: 'Trinity Large Preview',
        desc: 'Arcee AI Trinity Large',
        modelApi: 'arcee-ai/trinity-large-preview:free',
        provider: 'openrouter',
        isPro: true
    },
    {
        id: 11,
        name: 'LFM2.5 1.2B Thinking',
        desc: 'LiquidAI LFM2.5 1.2B Thinking',
        modelApi: 'liquid/lfm-2.5-1.2b-thinking:free',
        provider: 'openrouter',
        isPro: true
    },
    {
        id: 12,
        name: 'LFM2.5 1.2B Instruct',
        desc: 'LiquidAI LFM2.5 1.2B Instruct',
        modelApi: 'liquid/lfm-2.5-1.2b-instruct:free',
        provider: 'openrouter',
        isPro: false
    },
    {
        id: 13,
        name: 'Nemotron 3 Nano 30B',
        desc: 'NVIDIA Nemotron 3 Nano 30B',
        modelApi: 'nvidia/nemotron-3-nano-30b-a3b:free',
        provider: 'openrouter',
        isPro: false
    },
    {
        id: 14,
        name: 'Trinity Mini',
        desc: 'Arcee AI Trinity Mini',
        modelApi: 'arcee-ai/trinity-mini:free',
        provider: 'openrouter',
        isPro: true
    },
    {
        id: 15,
        name: 'Nemotron Nano 12B VL',
        desc: 'NVIDIA Nemotron Nano 12B VL',
        modelApi: 'nvidia/nemotron-nano-12b-v2-vl:free',
        provider: 'openrouter',
        isPro: true
    },
    {
        id: 16,
        name: 'Nemotron Nano 9B V2',
        desc: 'NVIDIA Nemotron Nano 9B V2',
        modelApi: 'nvidia/nemotron-nano-9b-v2:free',
        provider: 'openrouter',
        isPro: true
    },
    {
        id: 17,
        name: 'Gemma 3n 2B',
        desc: 'Google Gemini Gemma 3n 2B',
        modelApi: 'google/gemma-3n-e2b-it:free',
        provider: 'openrouter',
        isPro: false
    },
    {
        id: 18,
        name: 'Gemma 3n 4B',
        desc: 'Google Gemini Gemma 3n 4B',
        modelApi: 'google/gemma-3n-e4b-it:free',
        provider: 'openrouter',
        isPro: false
    },
    {
        id: 19,
        name: 'Gemma 3 4B',
        desc: 'Google Gemini Gemma 3 4B',
        modelApi: 'google/gemma-3-4b-it:free',
        provider: 'openrouter',
        isPro: false
    },
    {
        id: 20,
        name: 'Google 2.5 Flash',
        desc: 'Google Gemini 2.5 Flash',
        modelApi: 'google/gemma-3-12b-it:free',
        provider: 'openrouter',
        isPro: false
    },
    {
        id: 21,
        name: 'Google 2.5 Pro',
        desc: 'Google Gemini 2.5 Pro',
        modelApi: 'google/gemma-3-27b-it:free',
        provider: 'openrouter',
        isPro: false
    }
]

const VERIFIED_FREE_CODING_MODEL = 'z-ai/glm-4.5-air:free';
const TEMP_UNSTABLE_MODELS = new Set([
    'liquid/lfm-2.5-1.2b-instruct:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'google/gemma-3n-e4b-it:free',
    'google/gemma-3-4b-it:free',
]);

function getPreferredFreeCodingModel() {
    return AIModelsOption.find((model) => model.modelApi === VERIFIED_FREE_CODING_MODEL) || null;
}

// Utility function to get a random model from the list (excluding Auto)
// If isPro is false, only return free models; if true, return any model
export function getRandomModel(isPro = true) {
    let selectableModels = AIModelsOption.filter(model => model.modelApi !== 'auto');

    // For free users, filter to only non-Pro models
    if (!isPro) {
        selectableModels = selectableModels.filter(model => !model.isPro);
    }

    // Ensure we have at least one model to select
    if (selectableModels.length === 0) {
        console.warn('No selectable models found, using first non-auto model');
        selectableModels = AIModelsOption.filter(model => model.modelApi !== 'auto');
    }

    // For free users, prefer the runtime-verified coding model for stability.
    if (!isPro) {
        const preferred = getPreferredFreeCodingModel();
        if (preferred) return preferred;
    }

    const randomIndex = Math.floor(Math.random() * selectableModels.length);
    return selectableModels[randomIndex];
}

// Utility function to resolve the actual model to use (handles Auto selection)
export function resolveModel(selectedModel, isPro = true) {
    if (!selectedModel || selectedModel.modelApi === 'auto') {
        return getRandomModel(isPro);
    }

    if (selectedModel?.modelApi && TEMP_UNSTABLE_MODELS.has(selectedModel.modelApi)) {
        const fallback = getPreferredFreeCodingModel() || getRandomModel(isPro);
        return fallback;
    }

    return selectedModel;
}

// Utility function to check if a model is accessible for a user plan
export function canAccessModel(model, isPro) {
    // Auto is always accessible
    if (model.modelApi === 'auto') return true;

    // Pro users can access all models
    if (isPro) return true;

    // Free users can only access non-Pro models
    return !model.isPro;
}

// Utility function to get available models for a user plan
export function getAvailableModels(isPro) {
    if (isPro) {
        return AIModelsOption; // Pro users get all models
    }

    // Free users get only non-Pro models
    return AIModelsOption.filter(model => !model.isPro || model.modelApi === 'auto');
}

// Utility function to get models with access info
export function getModelsWithAccess(isPro) {
    return AIModelsOption.map(model => ({
        ...model,
        isAccessible: canAccessModel(model, isPro),
        requiresPro: model.isPro && !isPro
    }));
}
