const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

console.log('=== TWILIO DIAGNOSTIC REPORT ===');
console.log('Current working directory:', process.cwd());

const envPath = path.join(__dirname, '.env');
console.log('.env file path:', envPath);
console.log('.env file exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('\n--- Raw .env content (lines with TWILIO) ---');
  content.split('\n').forEach(line => {
    if (line.includes('TWILIO')) {
      const parts = line.split('=');
      const key = parts[0];
      const val = parts.slice(1).join('=');
      console.log(`${key}=${val.trim() ? '[POPULATED: ' + val.trim().substring(0, 5) + '...]' : '[EMPTY]'}`);
    }
  });
}

console.log('\n--- Active process.env Variables ---');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '[POPULATED]' : '[EMPTY]');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '[POPULATED]' : '[EMPTY]');
console.log('TWILIO_FROM_NUMBER:', process.env.TWILIO_FROM_NUMBER ? '[POPULATED]' : '[EMPTY]');
console.log('=================================');
