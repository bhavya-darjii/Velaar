import dotenv from 'dotenv';
import path from 'path';

// Load root .env
dotenv.config();

// Load server/.env which contains the SUPABASE_SERVICE_ROLE_KEY
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
