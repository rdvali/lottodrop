import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  { width: 192, height: 192, name: 'pwa-192x192.png' },
  { width: 512, height: 512, name: 'pwa-512x512.png' },
  { width: 192, height: 192, name: 'pwa-maskable-192x192.png', maskable: true },
  { width: 512, height: 512, name: 'pwa-maskable-512x512.png', maskable: true },
  { width: 180, height: 180, name: 'apple-touch-icon.png' },
  { width: 96, height: 96, name: 'icon-96x96.png' },
  { width: 16, height: 16, name: 'favicon-16x16.png' },
  { width: 32, height: 32, name: 'favicon-32x32.png' },
];

// Create a simple colored square as base icon
const createIcon = async (size) => {
  const { width, height, name, maskable } = size;
  
  // Create SVG with proper dimensions
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" rx="${width * 0.125}" fill="#1A1A2E"/>
      
      <!-- Gradient -->
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9D4EDD;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6A4C93;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Main Circle -->
      <circle cx="${width/2}" cy="${height/2}" r="${width * 0.3}" fill="url(#grad)"/>
      
      <!-- Text L -->
      <text x="${width/2}" y="${height/2 + height * 0.08}" 
            font-family="Arial, sans-serif" 
            font-size="${width * 0.25}" 
            font-weight="bold" 
            fill="#F1F1F1" 
            text-anchor="middle">LD</text>
      
      ${maskable ? `<!-- Safe area padding for maskable icons -->
      <circle cx="${width/2}" cy="${height/2}" r="${width * 0.4}" fill="none" stroke="#9D4EDD" stroke-width="1" opacity="0.1"/>` : ''}
    </svg>
  `;

  const outputPath = path.join(__dirname, '..', 'public', name);
  
  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated ${name}`);
  } catch (error) {
    console.error(`❌ Failed to generate ${name}:`, error);
  }
};

// Generate all icons
async function generateAllIcons() {
  console.log('🎨 Generating PWA icons...\n');
  
  for (const size of sizes) {
    await createIcon(size);
  }
  
  // Create favicon.ico from 32x32 PNG
  const favicon32Path = path.join(__dirname, '..', 'public', 'favicon-32x32.png');
  const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  
  try {
    await sharp(favicon32Path)
      .resize(32, 32)
      .toFile(faviconPath.replace('.ico', '-32.png'));
    console.log('✅ Generated favicon.ico (as PNG)');
  } catch (error) {
    console.error('❌ Failed to generate favicon:', error);
  }
  
  console.log('\n✨ All icons generated successfully!');
}

generateAllIcons().catch(console.error);