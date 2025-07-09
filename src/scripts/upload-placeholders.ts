import { uploadToStorage } from '../lib/storage';
import fs from 'fs/promises';
import path from 'path';

async function uploadPlaceholders() {
  try {
    // Upload SVG placeholder
    const svgPath = path.join(process.cwd(), 'public', 'images', 'placeholder-logo.svg');
    const svgBuffer = await fs.readFile(svgPath);
    const svgResult = await uploadToStorage(svgBuffer, 'placeholder-logo.svg', 'placeholders');
    console.log('Uploaded SVG placeholder:', svgResult.secure_url);

    // Create a simple PNG placeholder if it doesn't exist
    const pngBuffer = Buffer.from(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f0f0f0"/>
        <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#666" text-anchor="middle">
          Placeholder
        </text>
      </svg>
    `);
    const pngResult = await uploadToStorage(pngBuffer, 'placeholder-logo.png', 'placeholders');
    console.log('Created and uploaded PNG placeholder:', pngResult.secure_url);

    return {
      svg: svgResult.secure_url,
      png: pngResult.secure_url
    };
  } catch (error) {
    console.error('Error uploading placeholders:', error);
    throw error;
  }
}

// Run the script
uploadPlaceholders().then(urls => {
  console.log('\nPlaceholder URLs to use in components:');
  console.log('SVG:', urls.svg);
  console.log('PNG:', urls.png);
}).catch(console.error); 