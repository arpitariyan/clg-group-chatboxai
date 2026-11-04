/**
 * Structured Image Provider Error Classes
 * Provides clean categorization of provider errors for logging, client messages,
 * and deterministic fallback decisions.
 */

export class ImageProviderError extends Error {
    constructor(message, { provider, model, statusCode = 500, code = 'PROVIDER_ERROR', isRetryable = false, originalError = null } = {}) {
        super(message);
        this.name = 'ImageProviderError';
        this.provider = provider || 'unknown';
        this.model = model || 'unknown';
        this.statusCode = statusCode;
        this.code = code;
        this.isRetryable = isRetryable;
        this.originalError = originalError;
    }
}

export class ProviderAuthError extends ImageProviderError {
    constructor(message, { provider, model, statusCode = 401, code = 'AUTH_FAILED', originalError = null } = {}) {
        super(message || `Authentication failed for provider ${provider}.`, {
            provider,
            model,
            statusCode,
            code,
            isRetryable: false,
            originalError,
        });
        this.name = 'ProviderAuthError';
    }
}

export class ProviderQuotaError extends ImageProviderError {
    constructor(message, { provider, model, statusCode = 429, code = 'QUOTA_EXHAUSTED', originalError = null } = {}) {
        super(message || `Daily quota or rate limit exceeded for provider ${provider}.`, {
            provider,
            model,
            statusCode,
            code,
            isRetryable: true,
            originalError,
        });
        this.name = 'ProviderQuotaError';
    }
}

export class ProviderRateLimitError extends ImageProviderError {
    constructor(message, { provider, model, statusCode = 429, code = 'RATE_LIMIT', retryAfter = null, originalError = null } = {}) {
        super(message || `Rate limit reached for provider ${provider}.`, {
            provider,
            model,
            statusCode,
            code,
            isRetryable: true,
            originalError,
        });
        this.name = 'ProviderRateLimitError';
        this.retryAfter = retryAfter;
    }
}

export class ProviderContentPolicyError extends ImageProviderError {
    constructor(message, { provider, model, statusCode = 400, code = 'CONTENT_POLICY_VIOLATION', originalError = null } = {}) {
        super(message || 'The prompt was rejected by the content moderation policy.', {
            provider,
            model,
            statusCode,
            code,
            isRetryable: false,
            originalError,
        });
        this.name = 'ProviderContentPolicyError';
    }
}

export class ProviderBadRequestError extends ImageProviderError {
    constructor(message, { provider, model, statusCode = 400, code = 'BAD_REQUEST', originalError = null } = {}) {
        super(message || 'Invalid image generation request payload.', {
            provider,
            model,
            statusCode,
            code,
            isRetryable: false,
            originalError,
        });
        this.name = 'ProviderBadRequestError';
    }
}

export class ProviderTimeoutError extends ImageProviderError {
    constructor(message, { provider, model, statusCode = 504, code = 'TIMEOUT', originalError = null } = {}) {
        super(message || `Image generation timed out with provider ${provider}.`, {
            provider,
            model,
            statusCode,
            code,
            isRetryable: true,
            originalError,
        });
        this.name = 'ProviderTimeoutError';
    }
}

export class ProviderUnavailableError extends ImageProviderError {
    constructor(message, { provider, model, statusCode = 503, code = 'SERVICE_UNAVAILABLE', originalError = null } = {}) {
        super(message || `Provider ${provider} is temporarily unavailable.`, {
            provider,
            model,
            statusCode,
            code,
            isRetryable: true,
            originalError,
        });
        this.name = 'ProviderUnavailableError';
    }
}
