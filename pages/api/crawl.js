import { spawn } from "child_process";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const crawlScript = path.join(process.cwd(), "crawler", "crawl.py");
  const proc = spawn("python3", [crawlScript], {
    cwd: process.cwd(),
    env: { ...process.env },
  });

  let stdout = "";
  let stderr = "";

  proc.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  proc.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  proc.on("close", (code) => {
    if (code === 0) {
      res.status(200).json({ success: true, output: stdout });
    } else {
      res.status(500).json({ success: false, output: stdout, error: stderr });
    }
  });

  proc.on("error", (err) => {
    res.status(500).json({ success: false, error: err.message });
  });
}
