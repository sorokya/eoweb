const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const glob = require('glob');

const GFX_DIR = path.join(__dirname, '..', 'public', 'gfx');
const OUTPUT_ATLAS_PATH = path.join(GFX_DIR, 'atlas.png');
const OUTPUT_JSON_PATH = path.join(GFX_DIR, 'atlas.json');

const MAX_ATLAS_WIDTH = 4096; // Max width for the atlas image

async function generateAtlas() {
  console.log('Starting atlas generation...');

  const files = glob.sync(`${GFX_DIR}/**/*.png`);
  if (files.length === 0) {
    console.log('No PNG files found in public/gfx/. Exiting.');
    return;
  }

  const images = [];
  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;
  let atlasHeight = 0;

  const frames = {};

  for (const file of files) {
    const relativePath = path.relative(GFX_DIR, file).replace(/\\/g, '/');
    const metadata = await sharp(file).metadata();
    const { width, height } = metadata;

    if (currentX + width > MAX_ATLAS_WIDTH) {
      // Move to next row
      currentX = 0;
      currentY += rowHeight;
      rowHeight = 0;
    }

    images.push({
      input: file,
      left: currentX,
      top: currentY,
    });

    frames[relativePath] = {
      frame: { x: currentX, y: currentY, w: width, h: height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: width, h: height },
      sourceSize: { w: width, h: height },
    };

    currentX += width;
    rowHeight = Math.max(rowHeight, height);
    atlasHeight = Math.max(atlasHeight, currentY + rowHeight);
  }

  console.log(`Packing ${images.length} images into atlas...`);

  await sharp({
    create: {
      width: MAX_ATLAS_WIDTH,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    },
  })
    .composite(images)
    .toFile(OUTPUT_ATLAS_PATH);

  const atlasJson = {
    frames,
    meta: {
      image: path.basename(OUTPUT_ATLAS_PATH),
      size: { w: MAX_ATLAS_WIDTH, h: atlasHeight },
      scale: '1',
    },
  };

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(atlasJson, null, 2));

  console.log('Atlas generated successfully!');
  console.log(`Atlas image: ${OUTPUT_ATLAS_PATH}`);
  console.log(`Atlas JSON: ${OUTPUT_JSON_PATH}`);
}

generateAtlas().catch(console.error);
