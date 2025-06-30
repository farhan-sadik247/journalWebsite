/**
 * Simple test script to verify the author copy-edit review API works
 * Usage: node test-author-review-api.js [manuscriptId]
 */

const manuscriptId = process.argv[2] || '68629b12f1bf87c70d566158';

console.log('Testing author copy-edit review API...');
console.log('Manuscript ID:', manuscriptId);

// Test payload
const testPayload = {
  approval: 'approved',
  comments: 'This is a test submission from the API test script.',
  files: []
};

const apiUrl = `http://localhost:3000/api/manuscripts/${manuscriptId}/author-copy-edit-review`;

console.log('Sending test request to:', apiUrl);
console.log('Payload:', JSON.stringify(testPayload, null, 2));

fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testPayload)
})
.then(response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  return response.json();
})
.then(data => {
  console.log('Response data:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('Error:', error);
});
