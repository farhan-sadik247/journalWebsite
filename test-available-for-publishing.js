// Test script to verify the "Available for Publishing" tab functionality
const testAvailableForPublishing = async () => {
  try {
    console.log('🧪 Testing Available for Publishing functionality...');
    
    // Test 1: Fetch issues data
    const issuesResponse = await fetch('http://localhost:3000/api/issues');
    const issuesData = await issuesResponse.json();
    
    console.log('📊 Total issues found:', issuesData.issues?.length || 0);
    
    // Find unpublished issues with manuscripts
    const unpublishedIssues = issuesData.issues?.filter(issue => !issue.isPublished) || [];
    const readyForPublishing = unpublishedIssues.filter(issue => 
      issue.manuscripts && issue.manuscripts.length > 0
    );
    
    console.log('📋 Unpublished issues:', unpublishedIssues.length);
    console.log('🚀 Ready for publishing:', readyForPublishing.length);
    
    if (readyForPublishing.length > 0) {
      console.log('✅ Issues ready for publishing:');
      readyForPublishing.forEach((issue, index) => {
        console.log(`  ${index + 1}. Volume ${issue.volume?.number}, Issue ${issue.number}: ${issue.title}`);
        console.log(`     - ${issue.manuscripts?.length || 0} manuscripts`);
      });
    } else {
      console.log('ℹ️ No issues are currently ready for publishing');
      console.log('💡 To test this feature:');
      console.log('   1. Create an issue');
      console.log('   2. Assign some author-approved manuscripts to it');
      console.log('   3. The issue will then appear in "Available for Publishing"');
    }
    
    // Test 2: Check if we have any author-approved manuscripts
    const manuscriptsResponse = await fetch('http://localhost:3000/api/manuscripts/publication-dashboard');
    const manuscriptsData = await manuscriptsResponse.json();
    
    const authorApproved = manuscriptsData.manuscripts?.filter(m => 
      m.copyEditingStage === 'author-approved' && !m.volume && !m.issue
    ) || [];
    
    console.log('📄 Author-approved manuscripts available for assignment:', authorApproved.length);
    
    if (authorApproved.length > 0) {
      console.log('💡 You can assign these manuscripts to issues, then publish them!');
    }
    
  } catch (error) {
    console.error('❌ Error testing functionality:', error);
  }
};

// Run the test
testAvailableForPublishing();
