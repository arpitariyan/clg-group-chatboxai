import { config } from 'dotenv';
import { Client, Databases } from 'node-appwrite';

config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);

const dbId = process.env.APPWRITE_DATABASE_ID || '69a6aeff003b4922f883';

console.log('Checking collection...');
console.log('Database ID:', dbId);

try {
  const collection = await db.getCollection(dbId, 'conversation_memory');
  console.log('✅ Collection exists!');
  console.log('Name:', collection.name);
  console.log('ID:', collection.$id);
  console.log('Attributes count:', collection.attributes?.length || 0);
  
  if (collection.attributes) {
    console.log('\n📝 Attributes:');
    collection.attributes.forEach(attr => {
      console.log(`  - ${attr.key} (${attr.type})`);
    });
  }
} catch (error) {
  console.error('❌ Error:', error.type, error.message);
}
