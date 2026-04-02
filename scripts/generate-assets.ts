
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";

async function generateAssets() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key is missing!");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const assets = [
    { path: "assets/icon.png", prompt: "A professional, modern, flat design app icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 1024x1024." },
    { path: "assets/splash-icon.png", prompt: "A professional, modern, flat design splash screen icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 2000x2000." },
    { path: "assets/adaptive-icon.png", prompt: "A professional, modern, flat design adaptive icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 1024x1024." }
  ];

  // Ensure assets directory exists
  await fs.mkdir("assets", { recursive: true });

  for (const asset of assets) {
    console.log(`Generating ${asset.path}...`);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: asset.prompt }] },
      });

      let base64Image = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (base64Image) {
        await fs.writeFile(asset.path, Buffer.from(base64Image, 'base64'));
        console.log(`Successfully saved ${asset.path}`);
      }
    } catch (err) {
      console.error(`Failed to generate ${asset.path}:`, err);
    }
  }
}

generateAssets();
