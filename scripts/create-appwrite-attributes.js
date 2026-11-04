import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || 'subscriptions';

async function main() {
  try {
    console.log(`Checking attributes for database ${databaseId}, collection ${collectionId}...`);
    
    try {
      await databases.createStringAttribute(databaseId, collectionId, 'razorpay_order_id', 255, false);
      console.log('Created razorpay_order_id attribute');
    } catch (e) {
      if (e.code === 409) console.log('razorpay_order_id already exists');
      else console.error('Failed to create razorpay_order_id:', e.message);
    }

    try {
      await databases.createStringAttribute(databaseId, collectionId, 'user_email', 255, false);
      console.log('Created user_email attribute');
    } catch (e) {
      if (e.code === 409) console.log('user_email already exists');
      else console.error('Failed to create user_email:', e.message);
    }
    
    try {
      await databases.createStringAttribute(databaseId, collectionId, 'plan_type', 255, false);
      console.log('Created plan_type attribute');
    } catch (e) {
      if (e.code === 409) console.log('plan_type already exists');
      else console.error('Failed to create plan_type:', e.message);
    }
    
    try {
      await databases.createIntegerAttribute(databaseId, collectionId, 'amount', false);
      console.log('Created amount attribute');
    } catch (e) {
      if (e.code === 409) console.log('amount already exists');
      else console.error('Failed to create amount:', e.message);
    }
    
    try {
      await databases.createStringAttribute(databaseId, collectionId, 'currency', 255, false);
      console.log('Created currency attribute');
    } catch (e) {
      if (e.code === 409) console.log('currency already exists');
      else console.error('Failed to create currency:', e.message);
    }
    
    try {
      await databases.createStringAttribute(databaseId, collectionId, 'status', 255, false);
      console.log('Created status attribute');
    } catch (e) {
      if (e.code === 409) console.log('status already exists');
      else console.error('Failed to create status:', e.message);
    }
    
    try {
      await databases.createStringAttribute(databaseId, collectionId, 'razorpay_payment_id', 255, false);
      console.log('Created razorpay_payment_id attribute');
    } catch (e) {
      if (e.code === 409) console.log('razorpay_payment_id already exists');
      else console.error('Failed to create razorpay_payment_id:', e.message);
    }
    
    try {
      await databases.createStringAttribute(databaseId, collectionId, 'razorpay_subscription_id', 255, false);
      console.log('Created razorpay_subscription_id attribute');
    } catch (e) {
      if (e.code === 409) console.log('razorpay_subscription_id already exists');
      else console.error('Failed to create razorpay_subscription_id:', e.message);
    }
    
    console.log('Done creating attributes.');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
