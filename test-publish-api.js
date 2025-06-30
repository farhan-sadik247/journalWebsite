// Test publishing a manuscript
const url = 'http://localhost:3000/api/manuscripts/68629b12f1bf87c70d566158/publish';

const publishData = {
  action: 'direct-publish',
  publishedDate: new Date().toISOString(),
  doi: `10.1234/test.${Date.now()}`
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(publishData)
})
.then(response => response.json())
.then(data => {
  console.log('Publish result:', data);
})
.catch(error => {
  console.error('Publish error:', error);
});
