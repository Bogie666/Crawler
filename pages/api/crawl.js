export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "GITHUB_TOKEN not configured" });
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/Bogie666/Crawler/actions/workflows/crawl.yml/dispatches",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (response.status === 204) {
      return res.status(200).json({ success: true });
    } else {
      const error = await response.text();
      return res.status(response.status).json({ success: false, error });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
