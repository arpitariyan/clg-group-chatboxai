import { Client, Databases } from 'node-appwrite';
import fs from 'fs';
import path from 'path';

// Load env vars manually from .env if running standalone
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#\s][^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) process.env[key] = val;
        }
    });
}

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createCollection(collectionId, name, attributes) {
    try {
        console.log(`Checking if collection ${name} exists...`);
        try {
            await databases.getCollection(DB_ID, collectionId);
            console.log(`Collection ${name} already exists.`);
        } catch (e) {
            console.log(`Creating collection ${name}...`);
            await databases.createCollection(DB_ID, collectionId, name);
            console.log(`Created collection ${name}.`);
        }

        console.log(`Creating attributes for ${name}...`);
        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(DB_ID, collectionId, attr.key, attr.size, attr.required);
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(DB_ID, collectionId, attr.key, attr.required);
                }
                console.log(`Created attribute ${attr.key}`);
                await sleep(500);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log(`Attribute ${attr.key} already exists.`);
                } else {
                    console.error(`Error creating attribute ${attr.key}:`, err.message);
                }
            }
        }
        console.log(`Finished setting up ${name}.\n`);
        return collectionId;
    } catch (e) {
        console.error(`Error setting up ${name}:`, e.message);
    }
}

async function main() {
    console.log('Starting Deep Search Appwrite setup...');
    
    const cacheId = 'search_cache';
    const usageId = 'search_usage';

    await createCollection(cacheId, 'Search Cache', [
        { key: 'query', type: 'string', size: 1000, required: true },
        { key: 'results', type: 'string', size: 1000000, required: true }
    ]);

    await createCollection(usageId, 'Search Usage', [
        { key: 'query', type: 'string', size: 1000, required: true },
        { key: 'source', type: 'string', size: 50, required: true },
        { key: 'credits_consumed', type: 'integer', required: true },
        { key: 'complexity_score', type: 'integer', required: true },
        { key: 'fallback_reason', type: 'string', size: 500, required: false },
        { key: 'timestamp', type: 'string', size: 50, required: true }
    ]);

    // Update .env files
    const envFiles = ['.env', '.env.local'];
    for (const file of envFiles) {
        const p = path.resolve(file);
        if (fs.existsSync(p)) {
            let content = fs.readFileSync(p, 'utf8');
            let updated = false;
            
            if (!content.includes('NEXT_PUBLIC_APPWRITE_SEARCH_CACHE_COLLECTION_ID')) {
                content += `\nNEXT_PUBLIC_APPWRITE_SEARCH_CACHE_COLLECTION_ID=${cacheId}\n`;
                updated = true;
            }
            if (!content.includes('NEXT_PUBLIC_APPWRITE_SEARCH_USAGE_COLLECTION_ID')) {
                content += `NEXT_PUBLIC_APPWRITE_SEARCH_USAGE_COLLECTION_ID=${usageId}\n`;
                updated = true;
            }
            
            if (updated) {
                fs.writeFileSync(p, content);
                console.log(`Updated ${file} with new collection IDs.`);
            } else {
                console.log(`${file} already has the collection IDs.`);
            }
        }
    }
    
    console.log('Setup complete.');
}

main().catch(console.error);
