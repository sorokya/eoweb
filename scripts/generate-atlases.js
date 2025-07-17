const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const glob = require('glob');

const GFX_ROOT_DIR = path.join(__dirname, '..', 'public', 'gfx');
const MAX_ATLAS_WIDTH = 4096; // Max width for each atlas image

async function generateAtlases() {
  console.log('Starting atlas generation by folder...');

  const gfxDirs = fs
    .readdirSync(GFX_ROOT_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith('gfx'))
    .map((dirent) => path.join(GFX_ROOT_DIR, dirent.name));

  if (gfxDirs.length === 0) {
    console.log('No gfxXXX folders found in public/gfx/. Exiting.');
    return;
  }

  // Global cleanup: Delete existing atlas.png and atlas.json from all gfxXXX folders
  console.log('Performing global cleanup of existing atlas files...');
  for (const gfxDir of gfxDirs) {
    const folderName = path.basename(gfxDir);
    const outputAtlasPath = path.join(gfxDir, 'atlas.png');
    const outputJsonPath = path.join(gfxDir, 'atlas.json');
    try {
      if (fs.existsSync(outputAtlasPath)) {
        fs.unlinkSync(outputAtlasPath);
        console.log(
          `Deleted existing ${path.basename(outputAtlasPath)} from ${folderName}`,
        );
      }
      if (fs.existsSync(outputJsonPath)) {
        fs.unlinkSync(outputJsonPath);
        console.log(
          `Deleted existing ${path.basename(outputJsonPath)} from ${folderName}`,
        );
      }
    } catch (err) {
      console.error(`Error during global cleanup for ${folderName}:`, err);
    }
  }
  console.log('Global cleanup complete.');

  for (const gfxDir of gfxDirs) {
    const folderName = path.basename(gfxDir);
    console.log(`Processing folder: ${folderName}`);

    const files = glob.sync(`${gfxDir}/*.png`);
    if (files.length === 0) {
      console.log(`No PNG files found in ${folderName}. Skipping.`);
      continue;
    }

    const imagesToComposite = [];
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    let atlasHeight = 0;

    const frames = {};

    files.sort((a, b) => {
      const numA = Number.parseInt(path.basename(a, '.png'), 10);
      const numB = Number.parseInt(path.basename(b, '.png'), 10);
      return numA - numB;
    });

    for (const file of files) {
      const resourceId = Number.parseInt(path.basename(file, '.png'), 10) - 100;

      const metadata = await sharp(file).metadata();
      const { width, height } = metadata;

      if (currentX + width > MAX_ATLAS_WIDTH) {
        // Move to next row
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }

      imagesToComposite.push({
        input: file,
        left: currentX,
        top: currentY,
      });

      frames[resourceId] = {
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

    const outputAtlasPath = path.join(gfxDir, 'atlas.png');
    const outputJsonPath = path.join(gfxDir, 'atlas.json');

    console.log(
      `Packing ${imagesToComposite.length} images for ${folderName}...`,
    );

    try {
      const blankAtlas = sharp({
        create: {
          width: MAX_ATLAS_WIDTH,
          height: atlasHeight === 0 ? 1 : atlasHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      });

      await blankAtlas.composite(imagesToComposite).toFile(outputAtlasPath);

      const atlasJson = {
        frames,
        meta: {
          image: 'atlas.png',
          size: { w: MAX_ATLAS_WIDTH, h: atlasHeight },
          scale: '1',
        },
      };

      fs.writeFileSync(outputJsonPath, JSON.stringify(atlasJson, null, 2));

      console.log(`Successfully generated atlas for ${folderName}`);
    } catch (error) {
      console.error(`Error generating atlas for ${folderName}:`, error);
    }
  }

  console.log('All atlases generated.');
}

generateAtlases().catch(console.error);
