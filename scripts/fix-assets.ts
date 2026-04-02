
import fs from "fs/promises";
import path from "path";

async function fixAssets() {
  const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  const buffer = Buffer.from(base64, 'base64');
  
  const assets = ["assets/icon.png", "assets/splash-icon.png", "assets/adaptive-icon.png"];
  
  await fs.mkdir("assets", { recursive: true });
  
  for (const asset of assets) {
    await fs.writeFile(asset, buffer);
    console.log(`Fixed ${asset} with valid PNG buffer.`);
  }
}

fixAssets();
