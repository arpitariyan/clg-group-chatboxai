import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load .env.local before any application modules are evaluated
config({ path: resolve(process.cwd(), '.env.local') });

register('./test/alias-resolver.js', pathToFileURL('./'));
