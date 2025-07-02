// Script to search for the missing manuscript in all manuscripts
const findMissingManuscript = async () => {
  try {
    console.log('🔍 Searching for missing manuscript across all manuscripts...');
    
    // Check the general manuscripts API (this might require authentication)
    console.log('\n📋 Trying to find manuscript by title search...');
    
    // Try searching through submission API or direct database search
    // Since the APIs might require auth, let's try a different approach
    
    // Let's check if there are any manuscripts with this title in different statuses
    const searchTerms = ['deep learning', 'hand sign', 'ASL', 'speech'];
    
    for (const term of searchTerms) {
      try {
        console.log(`\n🔍 Searching for manuscripts containing "${term}"...`);
        
        // Try different API endpoints that might contain this manuscript
        const endpoints = [
          '/api/manuscripts',
          '/api/manuscripts/all',
          '/api/manuscripts/search',
        ];
        
        for (const endpoint of endpoints) {
          try {
            const searchUrl = `http://localhost:3000${endpoint}?q=${encodeURIComponent(term)}`;
            console.log(`Trying: ${searchUrl}`);
            
            const response = await fetch(searchUrl);
            console.log(`Response status: ${response.status}`);
            
            if (response.status === 401) {
              console.log('❌ Requires authentication');
            } else if (response.ok) {
              const data = await response.json();
              console.log('✅ Got response:', Object.keys(data));
              
              if (data.manuscripts && data.manuscripts.length > 0) {
                data.manuscripts.forEach((m, i) => {
                  if (m.title.toLowerCase().includes(term.toLowerCase())) {
                    console.log(`  Found: "${m.title}"`);
                    console.log(`    Status: ${m.status}`);
                    console.log(`    Stage: ${m.copyEditingStage || 'N/A'}`);
                  }
                });
              }
            }
          } catch (endpointError) {
            console.log(`❌ Error with ${endpoint}:`, endpointError.message);
          }
        }
      } catch (termError) {
        console.log(`❌ Error searching for "${term}":`, termError.message);
      }
    }
    
    console.log('\n💡 Recommendations:');
    console.log('1. Check if the manuscript exists in the admin dashboard');
    console.log('2. Verify if it was properly assigned to Issue 1');
    console.log('3. Check if the publication process was completed');
    console.log('4. Ensure the manuscript has status="published" and publishedDate');
    
  } catch (error) {
    console.error('❌ Error in search:', error);
  }
};

// Run the search
findMissingManuscript();
