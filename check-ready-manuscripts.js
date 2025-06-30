const { MongoClient } = require('mongodb');

async function checkManuscripts() {
  const client = new MongoClient('mongodb+srv://fsadik2319:v17Ad1JygFqbVPWd@journalweb1.oeyvwhv.mongodb.net/?retryWrites=true&w=majority&appName=journalweb1');
  await client.connect();
  const db = client.db('journal_website');
  
  const manuscripts = await db.collection('manuscripts').find({}).toArray();
  
  console.log(`Found ${manuscripts.length} manuscripts total:`);
  manuscripts.forEach(m => {
    console.log(`- Title: ${m.title}`);
    console.log(`  Status: ${m.status}`);
    console.log(`  CopyEditingStage: ${m.copyEditingStage}`);
    console.log(`  Latest Files: ${m.latestManuscriptFiles?.length || 0} files`);
    console.log(`  Author Review: ${m.authorCopyEditReview ? 'Yes' : 'No'}`);
    console.log('');
  });
  
  await client.close();
}

checkManuscripts().catch(console.error);
