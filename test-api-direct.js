const axios = require('axios');

// Test publication dashboard API endpoint directly
async function testPublicationAPI() {
  try {
    console.log('🔍 Testing publication dashboard API...');
    
    // Test without authentication first to see the error message
    try {
      const response = await axios.get('http://localhost:3000/api/manuscripts/publication-dashboard');
      console.log('✅ API Response:', response.data);
    } catch (error) {
      if (error.response) {
        console.log(`❌ API Error (${error.response.status}):`, error.response.data);
      } else {
        console.log('❌ Network Error:', error.message);
      }
    }
    
    // Test regular manuscripts endpoint
    try {
      const response = await axios.get('http://localhost:3000/api/manuscripts');
      console.log('✅ Regular API Response:', response.data);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Regular API Error (${error.response.status}):`, error.response.data);
      } else {
        console.log('❌ Regular Network Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPublicationAPI();
