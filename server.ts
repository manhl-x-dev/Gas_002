
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { Octokit } from "@octokit/rest";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route to sync all code to GitHub
  app.post("/api/sync-code", async (req, res) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_ACCESS_TOKEN || process.env.GH_SECRET;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: "GITHUB_TOKEN is missing in environment. Please add it to Secrets." });
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const owner = "manhl-x-dev";
    const repo = "Gas_002";

    try {
      const fs = await import("fs/promises");
      const { glob } = await import("glob");

      // Files to ignore
      const ignorePatterns = [
        "node_modules/**",
        ".git/**",
        "dist/**",
        ".next/**",
        ".expo/**",
        "package-lock.json",
        "bun.lockb"
      ];

      const files = await glob("**/*", { 
        nodir: true, 
        ignore: ignorePatterns,
        dot: true 
      });

      console.log(`Syncing ${files.length} files to GitHub...`);
      const results = [];

      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath);
          const base64Content = content.toString("base64");

          let sha;
          try {
            const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
            if (!Array.isArray(data)) sha = data.sha;
          } catch (e) {}

          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: `chore: sync ${filePath} from AI Studio`,
            content: base64Content,
            sha,
          });
          results.push({ path: filePath, status: "success" });
        } catch (err: any) {
          console.error(`Failed to sync ${filePath}:`, err.message);
          results.push({ path: filePath, status: "failed", error: err.message });
        }
      }

      res.json({ results });
    } catch (error: any) {
      console.error("Code sync failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to upload assets to GitHub
  app.post("/api/upload-to-github", async (req, res) => {
    const { path: assetPath, content: base64Image } = req.body;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_ACCESS_TOKEN || process.env.GH_SECRET;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: "GITHUB_TOKEN is missing in environment. Please add it to Secrets." });
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const owner = "manhl-x-dev";
    const repo = "Gas_002";

    try {
      console.log(`Uploading ${assetPath} to GitHub...`);
      let sha;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: assetPath });
        if (!Array.isArray(data)) sha = data.sha;
      } catch (e) {}

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: assetPath,
        message: `chore: upload ${assetPath} [skip ci]`,
        content: base64Image,
        sha,
      });

      res.json({ status: "success" });
    } catch (error: any) {
      console.error("GitHub upload failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
