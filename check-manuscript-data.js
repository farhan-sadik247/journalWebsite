// Simple test to check manuscript data in database
async function checkManuscriptData() {
  console.log('🔍 Checking manuscript data...\n');

  try {
    // 1. Test the publication dashboard endpoint
    console.log('1. Testing publication dashboard endpoint...');
    const response = await fetch('http://localhost:3000/api/manuscripts/publication-dashboard');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Publication dashboard API response:');
      console.log('Total manuscripts:', data.manuscripts?.length || 0);
      console.log('Debug info:', data.debug);
      
      if (data.manuscripts && data.manuscripts.length > 0) {
        console.log('\n📋 Manuscripts found:');
        data.manuscripts.forEach((manuscript, index) => {
          console.log(`${index + 1}. "${manuscript.title}"`);
          console.log(`   Status: ${manuscript.status}`);
          console.log(`   Copy Editing Stage: ${manuscript.copyEditingStage || 'N/A'}`);
          console.log(`   Published Date: ${manuscript.publishedDate || 'N/A'}`);
          console.log(`   Files: ${manuscript.latestManuscriptFiles?.length || 0}`);
          console.log('');
        });
      } else {
        console.log('❌ No manuscripts found for publication dashboard');
      }
    } else {
      const errorData = await response.json();
      console.log('❌ API Error:', response.status, errorData);
    }

    // 2. Test the regular manuscripts endpoint
    console.log('\n2. Testing regular manuscripts endpoint...');
    const regularResponse = await fetch('http://localhost:3000/api/manuscripts');
    
    if (regularResponse.ok) {
      const regularData = await regularResponse.json();
      console.log('✅ Regular manuscripts API response:');
      console.log('Total manuscripts:', regularData.manuscripts?.length || 0);
      
      if (regularData.manuscripts && regularData.manuscripts.length > 0) {
        console.log('\n📋 All manuscripts (first 5):');
        regularData.manuscripts.slice(0, 5).forEach((manuscript, index) => {
          console.log(`${index + 1}. "${manuscript.title}"`);
          console.log(`   Status: ${manuscript.status}`);
          console.log(`   Copy Editing Stage: ${manuscript.copyEditingStage || 'N/A'}`);
          console.log('');
        });
      }
    } else {
      const errorData = await regularResponse.json();
      console.log('❌ Regular API Error:', regularResponse.status, errorData);
    }

    // 3. Test the ready-for-publication endpoint
    console.log('\n3. Testing ready-for-publication endpoint...');
    const readyResponse = await fetch('http://localhost:3000/api/manuscripts/ready-for-publication');
    
    if (readyResponse.ok) {
      const readyData = await readyResponse.json();
      console.log('✅ Ready-for-publication API response:');
      console.log('Ready manuscripts:', readyData.manuscripts?.length || 0);
    } else {
      const errorData = await readyResponse.json();
      console.log('❌ Ready API Error:', readyResponse.status, errorData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the check
checkManuscriptData();
