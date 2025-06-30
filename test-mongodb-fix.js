// Test the fixed API endpoint
fetch('http://localhost:3000/api/manuscripts/68629b12f1bf87c70d566158/author-copy-edit-review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    approval: 'approved',
    comments: 'Test submission after MongoDB conflict fix',
    files: [
      {
        originalName: 'test-manuscript.pdf',
        filename: 'test-manuscript-123',
        url: 'https://example.com/test.pdf',
        size: 1024000,
        mimeType: 'application/pdf',
        uploadedBy: 'test-user-id',
        uploadedAt: new Date().toISOString()
      }
    ]
  })
})
.then(async r => {
  console.log('Status:', r.status);
  const data = await r.json();
  console.log('Response:', data);
})
.catch(console.error);
