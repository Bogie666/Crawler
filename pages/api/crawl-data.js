import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), "public", "crawl-data.json");
    const data = fs.readFileSync(filePath, "utf8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read crawl data" });
  }
}
