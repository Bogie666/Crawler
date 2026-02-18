import { useState, useMemo } from "react";
import Head from "next/head";
import crawlData from "../public/crawl-data.json";

const ISSUE_META = {
  broken:       { label: "Broken (404)",         color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  server_error: { label: "Server Error",          color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  missing_meta: { label: "Missing Meta Desc",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  no_schema:    { label: "No Schema",             color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  missing_h1:   { label: "Missing H1",            color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  multiple_h1:  { label: "Multiple H1s",          color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  orphan:       { label: "Orphaned Page",         color: "#14b8a6", bg: "rgba(20,184,166,0.12)" },
  deep_page:    { label: "Too Deep (4+ levels)",  color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  request_error:{ label: "Request Error",         color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const DEPTH_COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#6b7280"];

function getDepthColor(depth) {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
}

function formatDate(iso) {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}

function IssueTag({ type }) {
  const meta = ISSUE_META[type] || { label: type, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  return (
    <span style={{
      fontSize: 10, padding: "2px 7px", borderRadius: 4,
      background: meta.bg, color: meta.color,
      border: `1px solid ${meta.color}40`, fontFamily: "monospace",
      whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

function StatCard({ value, label, color = "#f1f5f9" }) {
  return (
    <div style={{
      background: "#111827", border: "1px solid #1e2d45", borderRadius: 10,
      padding: "14px 20px", minWidth: 110,
    }}>
      <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

function PageRow({ page, onClick, selected }) {
  const hasIssues = page.issues.length > 0;
  const depthColor = getDepthColor(page.depth);
  return (
    <div
      onClick={() => onClick(page)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px", borderBottom: "1px solid #0f172a",
        cursor: "pointer", transition: "background 0.1s",
        background: selected ? "#1e2d45" : (hasIssues ? "rgba(239,68,68,0.03)" : "transparent"),
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#111827"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = hasIssues ? "rgba(239,68,68,0.03)" : "transparent"; }}
    >
      {/* Depth indicator */}
      <div style={{
        width: 3, height: 32, borderRadius: 2,
        background: depthColor, flexShrink: 0,
      }} />

      {/* Depth number */}
      <div style={{
        fontSize: 10, color: depthColor, fontFamily: "monospace",
        width: 16, flexShrink: 0, textAlign: "center",
      }}>
        L{page.depth}
      </div>

      {/* Status code */}
      <div style={{
        fontSize: 11, fontFamily: "monospace", width: 36, flexShrink: 0,
        color: page.status_code === 200 ? "#10b981" : page.status_code === 404 ? "#ef4444" : "#f59e0b",
      }}>
        {page.status_code || "ERR"}
      </div>

      {/* Title + URL */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {page.title || page.url.replace("https://lexairconditioning.com", "")}
        </div>
        <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {page.url.replace("https://lexairconditioning.com", "") || "/"}
        </div>
      </div>

      {/* Issue tags */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 280 }}>
        {page.issues.slice(0, 3).map((issue, i) => (
          <IssueTag key={i} type={issue.type} />
        ))}
        {page.issues.length > 3 && (
          <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>+{page.issues.length - 3}</span>
        )}
      </div>
    </div>
  );
}

function PageDetail({ page, onClose }) {
  if (!page) return null;
  const path = page.url.replace("https://lexairconditioning.com", "") || "/";
  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 360,
      background: "#0f172a", borderLeft: "1px solid #1e2d45",
      overflowY: "auto", zIndex: 50, padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontFamily: "monospace", color: "#64748b" }}>Page Details</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 4, lineHeight: 1.4 }}>
        {page.title || "(No Title)"}
      </div>
      <div style={{ fontSize: 11, fontFamily: "monospace", color: "#3b82f6", marginBottom: 20, wordBreak: "break-all" }}>
        <a href={page.url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>{path}</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[
          ["Status", page.status_code || "Error", page.status_code === 200 ? "#10b981" : "#ef4444"],
          ["Depth", `Level ${page.depth}`, getDepthColor(page.depth)],
          ["Inbound Links", page.inbound_count, "#f1f5f9"],
          ["Child Pages", page.child_count, "#f1f5f9"],
          ["H1 Tags", page.h1_count, page.h1_count === 1 ? "#10b981" : "#f59e0b"],
          ["Schema", page.has_schema ? "✓ Yes" : "✗ None", page.has_schema ? "#10b981" : "#ef4444"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: "#111827", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e2d45" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: color || "#f1f5f9" }}>{value}</div>
          </div>
        ))}
      </div>

      {page.meta_description && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontFamily: "monospace" }}>META DESCRIPTION</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, background: "#111827", padding: "10px 12px", borderRadius: 8, border: "1px solid #1e2d45" }}>
            {page.meta_description}
          </div>
        </div>
      )}

      {page.schema_types.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontFamily: "monospace" }}>SCHEMA TYPES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {page.schema_types.map((t, i) => (
              <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)", fontFamily: "monospace" }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {page.issues.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, fontFamily: "monospace" }}>ISSUES ({page.issues.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {page.issues.map((issue, i) => {
              const meta = ISSUE_META[issue.type] || { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
              return (
                <div key={i} style={{ padding: "8px 12px", borderRadius: 7, background: meta.bg, border: `1px solid ${meta.color}30` }}>
                  <div style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>{meta.label || issue.type}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{issue.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { summary, pages } = crawlData;
  const [search, setSearch] = useState("");
  const [filterIssue, setFilterIssue] = useState("all");
  const [filterDepth, setFilterDepth] = useState("all");
  const [selectedPage, setSelectedPage] = useState(null);
  const [sortBy, setSortBy] = useState("depth");

  const issueTypes = useMemo(() => {
    const types = new Set();
    pages.forEach(p => p.issues.forEach(i => types.add(i.type)));
    return Array.from(types);
  }, []);

  const filtered = useMemo(() => {
    let result = pages;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.url.toLowerCase().includes(q) ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.meta_description || "").toLowerCase().includes(q)
      );
    }
    if (filterIssue !== "all") {
      result = result.filter(p => p.issues.some(i => i.type === filterIssue));
    }
    if (filterDepth !== "all") {
      result = result.filter(p => p.depth === parseInt(filterDepth));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "depth") return a.depth - b.depth || a.url.localeCompare(b.url);
      if (sortBy === "issues") return b.issues.length - a.issues.length;
      if (sortBy === "inbound") return b.inbound_count - a.inbound_count;
      if (sortBy === "status") return a.status_code - b.status_code;
      return 0;
    });
    return result;
  }, [pages, search, filterIssue, filterDepth, sortBy]);

  const maxDepth = summary.max_depth;
  const depthOptions = Array.from({ length: maxDepth + 1 }, (_, i) => i);

  const inputStyle = {
    background: "#111827", border: "1px solid #1e2d45", color: "#e2e8f0",
    borderRadius: 7, padding: "7px 12px", fontSize: 13, outline: "none",
    fontFamily: "inherit",
  };

  return (
    <>
      <Head>
        <title>LEX Site Map Dashboard</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{
        background: "#0a0e1a", minHeight: "100vh", color: "#f1f5f9",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        marginRight: selectedPage ? 360 : 0, transition: "margin-right 0.2s",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 24px", borderBottom: "1px solid #1e2d45",
          background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12,
          position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(8px)",
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Site Map
          </span>
          <span style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>
            LEX Air Conditioning
          </span>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#475569", fontFamily: "monospace" }}>
            Last crawl: {formatDate(summary.crawled_at)}
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: "20px 24px", display: "flex", gap: 12, flexWrap: "wrap", borderBottom: "1px solid #1e2d45" }}>
          <StatCard value={summary.total_pages} label="Pages Crawled" />
          <StatCard value={summary.max_depth} label="Max Depth" />
          <StatCard value={summary.pages_with_issues} label="Pages w/ Issues" color={summary.pages_with_issues > 0 ? "#f59e0b" : "#10b981"} />
          <StatCard value={summary.issue_counts?.broken || 0} label="Broken (404)" color={summary.issue_counts?.broken > 0 ? "#ef4444" : "#10b981"} />
          <StatCard value={summary.issue_counts?.orphan || 0} label="Orphaned Pages" color={summary.issue_counts?.orphan > 0 ? "#14b8a6" : "#10b981"} />
          <StatCard value={summary.issue_counts?.missing_meta || 0} label="Missing Meta" color={summary.issue_counts?.missing_meta > 0 ? "#f59e0b" : "#10b981"} />
          <StatCard value={summary.issue_counts?.no_schema || 0} label="No Schema" color={summary.issue_counts?.no_schema > 0 ? "#8b5cf6" : "#10b981"} />
          <StatCard value={`${summary.crawl_duration_seconds}s`} label="Crawl Time" color="#64748b" />
        </div>

        {/* Issue type breakdown bar */}
        {Object.keys(summary.issue_counts || {}).length > 0 && (
          <div style={{ padding: "12px 24px", borderBottom: "1px solid #1e2d45", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(summary.issue_counts).map(([type, count]) => {
              const meta = ISSUE_META[type] || { label: type, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
              return (
                <button
                  key={type}
                  onClick={() => setFilterIssue(filterIssue === type ? "all" : type)}
                  style={{
                    background: filterIssue === type ? meta.bg : "transparent",
                    border: `1px solid ${filterIssue === type ? meta.color : "#1e2d45"}`,
                    color: filterIssue === type ? meta.color : "#64748b",
                    borderRadius: 6, padding: "4px 10px", fontSize: 11,
                    cursor: "pointer", fontFamily: "monospace", transition: "all 0.15s",
                  }}
                >
                  {meta.label}: {count}
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #1e2d45", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            style={{ ...inputStyle, width: 280 }}
            placeholder="Search pages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={inputStyle} value={filterDepth} onChange={e => setFilterDepth(e.target.value)}>
            <option value="all">All Depths</option>
            {depthOptions.map(d => <option key={d} value={d}>Level {d}</option>)}
          </select>
          <select style={inputStyle} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="depth">Sort: Depth</option>
            <option value="issues">Sort: Most Issues</option>
            <option value="inbound">Sort: Most Inbound Links</option>
            <option value="status">Sort: Status Code</option>
          </select>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#475569" }}>
            {filtered.length} of {pages.length} pages
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "8px 16px", borderBottom: "1px solid #1e2d45",
          fontSize: 10, color: "#475569", fontFamily: "monospace",
          letterSpacing: "0.08em", textTransform: "uppercase",
          background: "#0d1420",
        }}>
          <div style={{ width: 3, flexShrink: 0 }} />
          <div style={{ width: 16, flexShrink: 0 }}>Lvl</div>
          <div style={{ width: 36, flexShrink: 0 }}>Status</div>
          <div style={{ flex: 1 }}>Page</div>
          <div style={{ width: 280, textAlign: "right" }}>Issues</div>
        </div>

        {/* Page list */}
        <div>
          {filtered.map((page, i) => (
            <PageRow
              key={page.url}
              page={page}
              onClick={setSelectedPage}
              selected={selectedPage?.url === page.url}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "48px", textAlign: "center", color: "#475569", fontSize: 14 }}>
              No pages match your filters.
            </div>
          )}
        </div>
      </div>

      {selectedPage && (
        <PageDetail page={selectedPage} onClose={() => setSelectedPage(null)} />
      )}
    </>
  );
}
