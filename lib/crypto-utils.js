import crypto from 'crypto';

let secretWarningLogged = false;

// The key should be a 32 byte (256 bit) random string in base64 or hex format
const getSecretKey = () => {
    const key = process.env.INCOGNITO_SECRET;
    if (!key) {
        // Fallback for development, though it should ideally throw an error in production
        // It uses a zero-filled buffer if the environment variable is missing
        if (!secretWarningLogged) {
            console.warn('⚠️ WARNING: INCOGNITO_SECRET is not set. Using insecure fallback key.');
            secretWarningLogged = true;
        }
        return Buffer.alloc(32); 
    }
    
    // Attempt to parse hex or string to a 32-byte buffer
    if (key.length === 64) {
        return Buffer.from(key, 'hex');
    }
    // If just a string, hash it to ensure it's exactly 32 bytes
    return crypto.createHash('sha256').update(key).digest();
};

const ALGORITHM = 'aes-256-gcm';

export function encryptIncognitoData(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(12); // 96-bit IV is standard for GCM
        const key = getSecretKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag().toString('base64');
        
        // Return format: IV:AuthTag:EncryptedData
        return `${iv.toString('base64')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('Error encrypting incognito data:', error);
        return text; // Fallback or could throw
    }
}

export function decryptIncognitoData(encryptedData) {
    if (!encryptedData) return encryptedData;
    
    // Check if it's in the expected format before attempting decryption
    if (typeof encryptedData !== 'string' || !encryptedData.includes(':')) {
        return encryptedData; // Not encrypted or legacy data
    }

    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) return encryptedData; // Fast reject

        const [ivBase64, authTagBase64, encryptedText] = parts;
        
        if (!ivBase64 || !authTagBase64 || !encryptedText) {
            return encryptedData;
        }

        const iv = Buffer.from(ivBase64, 'base64');
        if (iv.length !== 12) { // GCM standard IV size
            return encryptedData; 
        }

        const authTag = Buffer.from(authTagBase64, 'base64');
        const key = getSecretKey();
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Error decrypting incognito data:', error);
        return encryptedData; // Fallback to original if decryption fails (e.g. wrong key)
    }
}
