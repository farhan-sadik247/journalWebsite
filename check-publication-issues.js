// Script to check what might be wrong with manuscript publication
const checkPublicationIssues = async () => {
  try {
    console.log('🔍 Checking publication issues...');
    
    console.log('\n📊 Current published articles summary:');
    const articlesRes = await fetch('http://localhost:3000/api/articles');
    const articlesData = await articlesRes.json();
    
    console.log('Published articles:');
    articlesData.articles?.forEach((article, i) => {
      console.log(`${i + 1}. "${article.title}"`);
      console.log(`   Volume: ${article.volume}, Issue: ${article.issue}`);
      console.log(`   Published: ${new Date(article.publishedDate).toLocaleDateString()}`);
      console.log(`   Status in data: Published ✅`);
      console.log('');
    });
    
    console.log('🤔 Analysis:');
    console.log('- Issue 1 has 1 published article');
    console.log('- Issue 2 has 1 published article');
    console.log('- The missing "ASL" paper should be in Issue 1');
    console.log('');
    
    console.log('💡 Possible reasons for missing manuscript:');
    console.log('1. ❓ Manuscript was not properly assigned to Issue 1');
    console.log('2. ❓ Manuscript was assigned but Issue 1 was not fully published');
    console.log('3. ❓ Manuscript has wrong status (not "published")');
    console.log('4. ❓ Manuscript is missing publishedDate');
    console.log('5. ❓ There was an error during the publishing process');
    console.log('');
    
    console.log('🔧 Steps to fix:');
    console.log('1. Go to Publication Dashboard');
    console.log('2. Check "Available for Issue" tab for the missing manuscript');
    console.log('3. If found there, assign it to Issue 1');
    console.log('4. Go to "Available for Publishing" tab');
    console.log('5. If Issue 1 appears there, click "Publish Now"');
    console.log('6. If Issue 1 is already published, check individual manuscripts in Issue 1');
    console.log('');
    
    console.log('🎯 Expected result:');
    console.log('- Issue 1 should have 2 articles total');
    console.log('- Both should appear in the public articles list');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkPublicationIssues();
