// Investigation script to find the missing manuscript
const investigateMissingManuscript = async () => {
  try {
    console.log('🔍 Investigating missing manuscript...');
    
    // 1. Check all manuscripts in the publication dashboard
    console.log('\n📋 Checking publication dashboard manuscripts...');
    const dashboardRes = await fetch('http://localhost:3000/api/manuscripts/publication-dashboard');
    
    if (dashboardRes.ok) {
      const dashboardData = await dashboardRes.json();
      console.log(`Found ${dashboardData.manuscripts?.length || 0} manuscripts in dashboard`);
      
      // Look for the specific manuscript
      const targetManuscript = dashboardData.manuscripts?.find(m => 
        m.title.toLowerCase().includes('deep learning') && 
        m.title.toLowerCase().includes('hand sign')
      );
      
      if (targetManuscript) {
        console.log('\n🎯 Found target manuscript:');
        console.log(`  Title: ${targetManuscript.title}`);
        console.log(`  Status: ${targetManuscript.status}`);
        console.log(`  Copy Editing Stage: ${targetManuscript.copyEditingStage}`);
        console.log(`  Volume: ${targetManuscript.volume || 'Not set'}`);
        console.log(`  Issue: ${targetManuscript.issue || 'Not set'}`);
        console.log(`  Published Date: ${targetManuscript.publishedDate || 'Not set'}`);
        console.log(`  ID: ${targetManuscript._id}`);
        
        // Check if it has the right fields for being published
        if (targetManuscript.status === 'published') {
          console.log('✅ Manuscript has published status');
        } else {
          console.log('❌ Manuscript does NOT have published status');
        }
        
        if (targetManuscript.publishedDate) {
          console.log('✅ Manuscript has publishedDate');
        } else {
          console.log('❌ Manuscript does NOT have publishedDate');
        }
      } else {
        console.log('❌ Target manuscript not found in dashboard');
      }
      
      // Show all manuscripts for reference
      console.log('\n📄 All manuscripts in dashboard:');
      dashboardData.manuscripts?.forEach((m, i) => {
        console.log(`  ${i + 1}. "${m.title}"`);
        console.log(`     Status: ${m.status}, Stage: ${m.copyEditingStage}`);
        console.log(`     Vol: ${m.volume || 'N/A'}, Issue: ${m.issue || 'N/A'}`);
        console.log(`     Published: ${m.publishedDate || 'N/A'}`);
      });
    }
    
    // 2. Check what articles API returns
    console.log('\n📚 Checking articles API...');
    const articlesRes = await fetch('http://localhost:3000/api/articles');
    if (articlesRes.ok) {
      const articlesData = await articlesRes.json();
      console.log(`Articles API returns ${articlesData.articles?.length || 0} articles`);
      
      articlesData.articles?.forEach((a, i) => {
        console.log(`  ${i + 1}. "${a.title}"`);
        console.log(`     Vol: ${a.volume}, Issue: ${a.issue}`);
        console.log(`     Published: ${a.publishedDate}`);
      });
      
      // Check if target is in articles
      const targetInArticles = articlesData.articles?.find(a => 
        a.title.toLowerCase().includes('deep learning') && 
        a.title.toLowerCase().includes('hand sign')
      );
      
      if (targetInArticles) {
        console.log('✅ Target manuscript found in articles API');
      } else {
        console.log('❌ Target manuscript NOT found in articles API');
      }
    }
    
    // 3. Check what's the exact filter being used in articles API
    console.log('\n🔍 Testing articles API filter...');
    console.log('Filter used: { status: "published", publishedDate: { $exists: true } }');
    
  } catch (error) {
    console.error('❌ Error investigating:', error);
  }
};

// Run the investigation
investigateMissingManuscript();
