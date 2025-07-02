// Test script to verify published manuscript protection
// This would typically be run against the running development server

const testPublishedManuscriptProtection = async () => {
  const baseUrl = 'http://localhost:3000';
  
  // Example manuscript ID - replace with actual published manuscript ID
  const publishedManuscriptId = '67769c3acd4ce23a44b55cf9'; // ASL manuscript ID
  
  console.log('=== TESTING PUBLISHED MANUSCRIPT PROTECTION ===\n');
  
  try {
    // Test 1: Try to update status via API
    console.log('Test 1: Attempting to update status of published manuscript...');
    const statusUpdateResponse = await fetch(`${baseUrl}/api/manuscripts/${publishedManuscriptId}/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real test, would need proper authentication headers
      }
    });
    
    const statusResult = await statusUpdateResponse.json();
    console.log('Status update result:', statusResult);
    
    if (statusUpdateResponse.status === 400 && statusResult.error?.includes('published')) {
      console.log('✅ API protection working - status update blocked');
    } else {
      console.log('❌ API protection failed - status update allowed');
    }
    
    // Test 2: Check manuscript details endpoint
    console.log('\nTest 2: Fetching manuscript details...');
    const detailsResponse = await fetch(`${baseUrl}/api/manuscripts/${publishedManuscriptId}`);
    const detailsResult = await detailsResponse.json();
    
    if (detailsResult.manuscript?.status === 'published') {
      console.log('✅ Manuscript is published');
      console.log(`   Title: ${detailsResult.manuscript.title}`);
      console.log(`   Status: ${detailsResult.manuscript.status}`);
    } else {
      console.log('❌ Manuscript status is not published');
    }
    
    // Test 3: Check if manuscript appears in articles API
    console.log('\nTest 3: Checking visibility in articles API...');
    const articlesResponse = await fetch(`${baseUrl}/api/articles`);
    const articlesResult = await articlesResponse.json();
    
    const publishedArticles = articlesResult.articles || [];
    const targetArticle = publishedArticles.find(article => 
      article._id === publishedManuscriptId || 
      article.title?.includes('ASL') || 
      article.title?.includes('sign language')
    );
    
    if (targetArticle) {
      console.log('✅ Published manuscript is visible in articles API');
      console.log(`   Title: ${targetArticle.title}`);
    } else {
      console.log('❌ Published manuscript not found in articles API');
      console.log(`   Total articles found: ${publishedArticles.length}`);
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
};

// Note: This script shows the test logic but can't run here without proper server context
console.log('Test script ready. To run, copy this to browser console when on localhost:3000');
console.log('Or create a separate test file and run with proper authentication');

module.exports = { testPublishedManuscriptProtection };
