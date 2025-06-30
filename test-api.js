// Quick test to verify the API is working
fetch('http://localhost:3000/api/manuscripts/68629b12f1bf87c70d566158/author-copy-edit-review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    approval: 'approved',
    comments: 'Test submission',
    files: []
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
