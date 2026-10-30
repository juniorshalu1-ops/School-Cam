import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

async function zipDist() {
  const distDir = path.resolve('dist');
  const outputFile = path.resolve('public', 'SchoolCam_App_Package.zip');

  if (!fs.existsSync(distDir)) {
    console.error('dist directory does not exist');
    process.exit(1);
  }

  const output = fs.createWriteStream(outputFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`Successfully created ${outputFile} (${archive.pointer()} total bytes)`);
  });

  archive.on('error', (err: unknown) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(distDir, false);
  await archive.finalize();
}

zipDist().catch(console.error);
