// Run this script to initialize the founder admin
// Usage: Run from the admin test page or call the API directly

const initializeFounderAdmin = async () => {
  try {
    console.log('Initializing founder admin...');
    
    const response = await fetch('/api/admin', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Founder initialized successfully:', data);
      return data;
    } else {
      console.error('❌ Failed to initialize founder:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error initializing founder:', error);
    return null;
  }
};

// Export for use in components
export { initializeFounderAdmin };

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('Founder Admin Initialization Script Loaded');
  console.log('Run initializeFounderAdmin() to set up the founder admin');
}
