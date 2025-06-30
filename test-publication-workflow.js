// Test script to check manuscript publication workflow
async function testPublicationWorkflow() {
  console.log('🧪 Testing Publication Workflow...\n');

  try {
    // 1. Check manuscripts ready for publication
    console.log('1. Fetching manuscripts ready for publication...');
    const readyResponse = await fetch('http://localhost:3000/api/manuscripts/ready-for-publication');
    const readyData = await readyResponse.json();
    console.log(`Found ${readyData.manuscripts?.length || 0} manuscripts ready for publication`);
    
    if (readyData.manuscripts && readyData.manuscripts.length > 0) {
      const testManuscript = readyData.manuscripts[0];
      console.log(`Testing with manuscript: "${testManuscript.title}"`);
      
      // 2. Test direct publish
      console.log('\n2. Testing direct publish...');
      const publishResponse = await fetch(`http://localhost:3000/api/manuscripts/${testManuscript._id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishedDate: new Date().toISOString(),
          action: 'direct-publish',
          doi: `10.1234/test.${Date.now()}`
        })
      });
      
      if (publishResponse.ok) {
        const publishResult = await publishResponse.json();
        console.log('✅ Publish successful!', publishResult.message);
        
        // 3. Check if manuscript appears in published articles
        console.log('\n3. Checking published articles...');
        const articlesResponse = await fetch('http://localhost:3000/api/articles');
        const articlesData = await articlesResponse.json();
        
        const publishedManuscript = articlesData.articles?.find(a => a._id === testManuscript._id);
        if (publishedManuscript) {
          console.log('✅ Manuscript found in published articles!');
          console.log(`Title: ${publishedManuscript.title}`);
          console.log(`Published Date: ${publishedManuscript.publishedDate}`);
        } else {
          console.log('❌ Manuscript NOT found in published articles');
        }
        
        // 4. Check if manuscript appears in search
        console.log('\n4. Testing search functionality...');
        const searchResponse = await fetch(`http://localhost:3000/api/search/manuscripts?query=${encodeURIComponent(testManuscript.title)}`);
        const searchData = await searchResponse.json();
        
        const foundInSearch = searchData.manuscripts?.find(m => m._id === testManuscript._id);
        if (foundInSearch) {
          console.log('✅ Manuscript found in search results!');
        } else {
          console.log('❌ Manuscript NOT found in search results');
        }
        
      } else {
        const errorData = await publishResponse.json();
        console.log('❌ Publish failed:', errorData.error);
      }
      
    } else {
      console.log('ℹ️ No manuscripts ready for publication found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPublicationWorkflow();
