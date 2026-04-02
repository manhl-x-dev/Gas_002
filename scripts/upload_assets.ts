
import { GoogleGenAI } from "@google/genai";
import { Octokit } from "@octokit/rest";

// Try to find the GitHub token in environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_ACCESS_TOKEN || process.env.GH_SECRET;

async function generateImage(ai: any, prompt: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data; // base64 string
    }
  }
  throw new Error("No image generated");
}

async function uploadToGitHub(octokit: any, path: string, content: string) {
  const owner = "manhl-x-dev";
  const repo = "Gas_002";

  try {
    let sha;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path });
      if (!Array.isArray(data)) sha = data.sha;
    } catch (e) {}

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `chore: upload ${path} [skip ci]`,
      content,
      sha,
    });
    console.log(`Successfully uploaded ${path} to GitHub`);
  } catch (error: any) {
    console.error(`Error uploading ${path}:`, error.message);
  }
}

async function run() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing");
    return;
  }

  if (!GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN is missing. Please ensure you named your secret GITHUB_TOKEN or GH_TOKEN.");
    // List available env vars for debugging (excluding values)
    console.log("Available env vars:", Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('TOKEN')));
    return;
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  console.log("Starting asset generation and upload...");

  try {
    console.log("Generating icon.png...");
    const icon = await generateImage(ai, "A professional, modern, flat design app icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 1024x1024.");
    await uploadToGitHub(octokit, "assets/icon.png", icon);

    console.log("Generating splash-icon.png...");
    const splash = await generateImage(ai, "A professional, modern, flat design splash screen icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 2000x2000.");
    await uploadToGitHub(octokit, "assets/splash-icon.png", splash);

    console.log("Generating adaptive-icon.png...");
    const adaptive = await generateImage(ai, "A professional, modern, flat design adaptive icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 1024x1024.");
    await uploadToGitHub(octokit, "assets/adaptive-icon.png", adaptive);

    console.log("All assets processed.");
  } catch (error: any) {
    console.error("Process failed:", error.message);
  }
}

run();
