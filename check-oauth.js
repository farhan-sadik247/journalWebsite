// Google OAuth Configuration Checker
// Run this to verify your OAuth setup

require('dotenv').config({ path: '.env.local' });

const config = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  domainBaseUrl: process.env.DOMAIN_BASE_URL,
  nodeEnv: process.env.NODE_ENV
};

console.log('=== Google OAuth Configuration Check ===');
console.log('Environment:', config.nodeEnv || 'development');
console.log('Client ID:', config.clientId ? 'SET ✅' : 'MISSING ❌');
console.log('NextAuth URL:', config.nextAuthUrl);
console.log('Domain Base URL:', config.domainBaseUrl);

console.log('\n=== Expected Callback URLs ===');
console.log('Development:', 'http://localhost:3000/api/auth/callback/google');
console.log('Production:', 'https://gjadt.org/api/auth/callback/google');

console.log('\n=== Action Required ===');
console.log('1. Go to Google Cloud Console');
console.log('2. Navigate to APIs & Services → Credentials');
console.log('3. Edit your OAuth 2.0 Client ID');
console.log('4. Add both URLs above to "Authorized redirect URIs"');

console.log('\n=== Test URLs ===');
console.log('After updating Google Console, test these:');
console.log('Local:', 'http://localhost:3000/auth/signin');
console.log('Production:', 'https://gjadt.org/auth/signin');
