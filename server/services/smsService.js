const https = require('https');
const querystring = require('querystring');

/**
 * Send an SMS reminder to a phone number.
 * Supports Twilio, Fast2SMS, and terminal logging fallback for local development.
 * Uses 100% native Node.js libraries to ensure zero dependency requirements and total portability.
 */
exports.sendSMS = async ({ to, message }) => {
  try {
    if (!to) {
      console.log('⚠️ SMS Dispatch: No target phone number specified.');
      return;
    }

    // Clean phone number (strip whitespace, dashes, and extra chars)
    const cleanNumber = to.toString().replace(/[\s-+]/g, '');

    // 1. Fast2SMS Integration (Ideal for Indian mobile networks)
    if (process.env.FAST2SMS_API_KEY) {
      console.log(`📱 Sending Fast2SMS alert to: ${cleanNumber}`);
      
      const postData = JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        numbers: cleanNumber
      });

      const options = {
        hostname: 'www.fast2sms.com',
        path: '/dev/bulkV2',
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve(body));
        });
        req.on('error', err => reject(err));
        req.write(postData);
        req.end();
      });

      console.log(`✅ Fast2SMS response:`, result);
      return result;
    }

    // 2. Twilio Integration (Global communication gateway)
    const twilioSID = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
    const twilioAuthToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
    const twilioFrom = String(process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER || '').trim();

    if (twilioSID && twilioAuthToken && twilioFrom) {
      console.log(`📱 Sending Twilio SMS alert to: ${to}`);
      
      const postData = querystring.stringify({
        To: to,
        From: twilioFrom,
        Body: message
      });

      const auth = Buffer.from(`${twilioSID}:${twilioAuthToken}`).toString('base64');

      const options = {
        hostname: 'api.twilio.com',
        path: `/2010-04-01/Accounts/${twilioSID}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve(body));
        });
        req.on('error', err => reject(err));
        req.write(postData);
        req.end();
      });

      console.log(`✅ Twilio response:`, result);
      return result;
    }

    // 3. Fallback Terminal Logger (Ideal for developer local verifications)
    console.log(`\n--- 📱 MOCK SMS DISPATCH ---`);
    console.log(`To: ${to}`);
    console.log(`Message: "${message}"`);
    console.log(`-----------------------------\n`);
    return { success: true, mock: true };

  } catch (error) {
    console.error('❌ Failed to send SMS reminder:', error.message);
    // Silent fail to prevent scheduler crashes
  }
};
