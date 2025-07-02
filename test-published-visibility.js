// Test script to check published articles and their visibility
const testPublishedArticles = async () => {
  try {
    console.log('🔍 Testing published articles visibility...');
    
    // 1. Check articles API
    console.log('\n📚 Checking /api/articles...');
    const articlesRes = await fetch('http://localhost:3000/api/articles');
    const articlesData = await articlesRes.json();
    
    console.log(`Found ${articlesData.articles?.length || 0} published articles`);
    
    if (articlesData.articles?.length > 0) {
      console.log('\n📄 Published Articles:');
      articlesData.articles.forEach((article, index) => {
        console.log(`  ${index + 1}. "${article.title}"`);
        console.log(`     - Status: ${article.status || 'Not set'}`);
        console.log(`     - Volume: ${article.volume || 'Not set'}`);
        console.log(`     - Issue: ${article.issue || 'Not set'}`);
        console.log(`     - Published Date: ${article.publishedDate || 'Not set'}`);
        console.log(`     - DOI: ${article.doi || 'Not set'}`);
        console.log(`     - Category: ${article.category}`);
        console.log(`     - Authors: ${article.authors?.map(a => a.name).join(', ')}`);
        console.log('');
      });
    }
    
    // 2. Check issues API
    console.log('📖 Checking /api/issues...');
    const issuesRes = await fetch('http://localhost:3000/api/issues');
    const issuesData = await issuesRes.json();
    
    console.log(`Found ${issuesData.issues?.length || 0} total issues`);
    
    const publishedIssues = issuesData.issues?.filter(issue => issue.isPublished) || [];
    const unpublishedWithManuscripts = issuesData.issues?.filter(issue => 
      !issue.isPublished && issue.manuscripts && issue.manuscripts.length > 0
    ) || [];
    
    console.log(`📗 Published issues: ${publishedIssues.length}`);
    console.log(`📘 Ready for publishing: ${unpublishedWithManuscripts.length}`);
    
    if (publishedIssues.length > 0) {
      console.log('\n✅ Published Issues:');
      publishedIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. Volume ${issue.volume?.number}, Issue ${issue.number}: ${issue.title}`);
        console.log(`     - Published: ${issue.publishedDate || 'Date not set'}`);
        console.log(`     - Manuscripts: ${issue.manuscripts?.length || 0}`);
      });
    }
    
    if (unpublishedWithManuscripts.length > 0) {
      console.log('\n🚀 Ready to Publish:');
      unpublishedWithManuscripts.forEach((issue, index) => {
        console.log(`  ${index + 1}. Volume ${issue.volume?.number}, Issue ${issue.number}: ${issue.title}`);
        console.log(`     - Manuscripts: ${issue.manuscripts?.length || 0}`);
      });
    }
    
    // 3. Test direct browser access
    console.log('\n🌐 Testing browser access:');
    console.log('   - Main articles page: http://localhost:3000/articles');
    console.log('   - Home page (recent articles): http://localhost:3000');
    
    if (articlesData.articles?.length > 0) {
      const firstArticle = articlesData.articles[0];
      console.log(`   - First article: http://localhost:3000/articles/${firstArticle._id}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing:', error);
  }
};

// Run the test
testPublishedArticles();
