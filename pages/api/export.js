import { promises as fs } from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { domain, format } = req.query;

  // Load crawl data
  let data;
  try {
    const filePath = path.join(process.cwd(), "public", "crawl-data.json");
    const raw = await fs.readFile(filePath, "utf-8");
    data = JSON.parse(raw);
  } catch {
    return res.status(500).json({ error: "Failed to load crawl data" });
  }

  // If domain is specified, verify it matches the crawled domain
  if (domain) {
    const base = data.summary?.base_url || "";
    const crawledDomain = base.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (
      domain !== crawledDomain &&
      domain !== `www.${crawledDomain}` &&
      `www.${domain}` !== crawledDomain
    ) {
      return res.status(404).json({
        error: `No data for domain "${domain}". Available: ${crawledDomain}`,
      });
    }
  }

  const pages = (data.pages || []).map((p) => ({
    url: p.url,
    status: p.status_code,
    canonical: p.canonical || null,
    title: p.title || null,
    metaDescription: p.meta_description || null,
    h1: p.h1 || null,
    schemaTypes: p.schema_types || [],
    wordCount: p.word_count ?? 0,
    inLinks: p.inbound_count ?? 0,
    outLinks: p.outlinks ?? 0,
    depth: p.depth ?? null,
    issues: (p.issues || []).map((i) => i.type),
  }));

  const result = {
    domain: data.summary?.base_url,
    crawledAt: data.summary?.crawled_at,
    totalPages: data.summary?.total_pages,
    pages,
  };

  // NDJSON format
  if (format === "ndjson") {
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="export.ndjson"'
    );
    const lines = pages.map((p) => JSON.stringify(p)).join("\n");
    return res.status(200).send(lines + "\n");
  }

  // Default: JSON
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json(result);
}
