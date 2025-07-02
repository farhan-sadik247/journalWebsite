// Simple test for articles API
console.log('Testing fetch from localhost...');

fetch('http://localhost:3000/api/articles')
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(d => {
    console.log('Success! Articles:', d.articles?.length);
    if (d.articles?.length > 0) {
      console.log('Article titles:');
      d.articles.forEach((a, i) => console.log(`${i+1}. ${a.title}`));
    } else {
      console.log('No articles found');
    }
  })
  .catch(e => console.error('Error:', e));
