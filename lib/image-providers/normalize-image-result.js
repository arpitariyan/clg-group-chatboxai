/**
 * Normalized internal image result structure
 * Ensures consistent output across all providers (Cloudflare, ModelScope, Hugging Face).
 */

export function createNormalizedImageResult({
    buffer,
    mimeType = 'image/png',
    provider,
    model,
    width,
    height,
    aspectRatio = '1:1',
    generationType = 'text-to-image',
    metadata = {},
}) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('Normalized image result requires a non-empty Buffer.');
    }

    return {
        buffer,
        mimeType,
        provider: String(provider || 'unknown'),
        model: String(model || 'unknown'),
        width: Number(width) || 1024,
        height: Number(height) || 1024,
        aspectRatio: String(aspectRatio || `${width}x${height}`),
        generationType: String(generationType || 'text-to-image'),
        metadata: {
            timestamp: Date.now(),
            processingMode: metadata.processingMode || 'native',
            steps: metadata.steps !== undefined ? metadata.steps : null,
            seed: metadata.seed !== undefined ? metadata.seed : null,
            taskId: metadata.taskId || null,
            fallbackOccurred: Boolean(metadata.fallbackOccurred),
            originalProvider: metadata.originalProvider || null,
            originalModel: metadata.originalModel || null,
            fallbackReason: metadata.fallbackReason || null,
            ...metadata,
        },
    };
}
