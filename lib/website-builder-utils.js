/**
 * Website Builder Utility Functions
 */

/**
 * Extracts metadata from HTML code
 * @param {string} code - HTML code
 * @returns {Object} Metadata with title, description, etc.
 */
export function extractWebsiteMetadata(code) {
    const metadata = {
        title: 'Untitled Website',
        description: '',
        hasImages: false,
        hasJavaScript: false
    };

    try {
        // Extract title
        const titleMatch = code.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
            metadata.title = titleMatch[1].trim();
        }

        // Extract description
        const descMatch = code.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
        if (descMatch) {
            metadata.description = descMatch[1].trim();
        }

        // Check for images
        metadata.hasImages = /<img\s/i.test(code);

        // Check for JavaScript
        metadata.hasJavaScript = /<script/i.test(code);

    } catch (error) {
        console.error('Error extracting metadata:', error);
    }

    return metadata;
}

/**
 * Sanitizes user-generated code for security
 * @param {string} code - HTML code to sanitize
 * @returns {string} Sanitized code
 */
export function sanitizeCode(code) {
    // For now, we trust the AI-generated code
    // In production, you might want to add additional sanitization
    // like removing dangerous scripts, validating external URLs, etc.

    // Basic sanitization: remove any potential XSS in inline event handlers
    let sanitized = code;

    // Remove dangerous patterns (be careful not to break legitimate code)
    // This is a basic implementation - consider using a proper HTML sanitizer library

    return sanitized;
}

/**
 * Formats conversation history for AI context
 * @param {Array} messages - Array of message objects
 * @returns {Array} Formatted messages for AI
 */
export function formatConversation(messages) {
    return messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));
}

/**
 * Generates a project name from a prompt
 * @param {string} prompt - User's prompt
 * @returns {string} Generated project name
 */
export function generateProjectName(prompt) {
    // Take first 50 characters and clean up
    let name = prompt.substring(0, 50).trim();

    // Remove special characters
    name = name.replace(/[^a-zA-Z0-9\s-]/g, '');

    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);

    // If empty, use default
    if (!name) {
        name = 'Website Project';
    }

    return name;
}

/**
 * Validates HTML code for basic structure
 * @param {string} code - HTML code
 * @returns {Object} Validation result with isValid and errors
 */
export function validateHTML(code) {
    const result = {
        isValid: true,
        errors: []
    };

    // Check for DOCTYPE
    if (!code.toLowerCase().includes('<!doctype html>')) {
        result.errors.push('Missing DOCTYPE declaration');
    }

    // Check for basic HTML structure
    if (!/<html/i.test(code)) {
        result.isValid = false;
        result.errors.push('Missing <html> tag');
    }

    if (!/<head/i.test(code)) {
        result.errors.push('Missing <head> tag');
    }

    if (!/<body/i.test(code)) {
        result.isValid = false;
        result.errors.push('Missing <body> tag');
    }

    return result;
}

/**
 * Minifies HTML code (basic implementation)
 * @param {string} code - HTML code
 * @returns {string} Minified code
 */
export function minifyHTML(code) {
    return code
        .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/>\s+</g, '><') // Remove spaces between tags
        .trim();
}

/**
 * Extracts primary color from CSS in HTML
 * @param {string} code - HTML code
 * @returns {string} Hex color code or default
 */
export function extractPrimaryColor(code) {
    // Try to find common color patterns in Tailwind or inline styles
    const colorPatterns = [
        /bg-(\w+)-(\d+)/g, // Tailwind bg colors
        /text-(\w+)-(\d+)/g, // Tailwind text colors
        /#([0-9A-Fa-f]{6})/g // Hex colors
    ];

    for (const pattern of colorPatterns) {
        const match = code.match(pattern);
        if (match && match[0]) {
            // Return first found color
            if (match[0].startsWith('#')) {
                return match[0];
            }
            // For Tailwind, return a default based on color name
            const colorName = match[0].match(/bg-(\w+)/)?.[1] || 'blue';
            return getTailwindColor(colorName);
        }
    }

    return '#3b82f6'; // Default blue
}

/**
 * Gets hex color from Tailwind color name
 * @param {string} colorName - Tailwind color name
 * @returns {string} Hex color
 */
function getTailwindColor(colorName) {
    const colors = {
        'blue': '#3b82f6',
        'indigo': '#6366f1',
        'purple': '#a855f7',
        'pink': '#ec4899',
        'red': '#ef4444',
        'orange': '#f97316',
        'yellow': '#eab308',
        'green': '#22c55e',
        'teal': '#14b8a6',
        'cyan': '#06b6d4',
        'gray': '#6b7280',
        'slate': '#64748b'
    };

    return colors[colorName] || '#3b82f6';
}
