const url = 'http://localhost:3000/api/manuscripts/68629b12f1bf87c70d566158/update-status';

const updateData = {
  status: 'ready-for-publication',
  copyEditingStage: 'author-approved'
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updateData)
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
})
.catch(error => {
  console.error('Error:', error);
});
