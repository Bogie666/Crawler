import { useState, useMemo, useEffect } from "react";
import Head from "next/head";

const ISSUE_META = {
  broken:        { label: "Broken (404)",        color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  server_error:  { label: "Server Error",         color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  missing_meta:  { label: "Missing Meta",         color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  no_schema:     { label: "No Schema",            color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  missing_h1:    { label: "Missing H1",           color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  multiple_h1:   { label: "Multiple H1s",         color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  orphan:        { label: "Orphaned Page",        color: "#14b8a6", bg: "rgba(20,184,166,0.12)" },
  deep_page:     { label: "Too Deep",             color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  request_error: { label: "Request Error",        color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const DEPTH_COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#6366f1","#94a3b8"];
const CONN = "#1e3a5f";

function getDepthColor(d) { return DEPTH_COLORS[Math.min(d, DEPTH_COLORS.length - 1)]; }
function shortPath(url) { return url.replace(/https?:\/\/[^/]+/, "") || "/"; }
function formatDate(iso) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}

function buildTree(pages) {
  const map = {};
  pages.forEach(p => { map[p.url] = { ...p, children: [] }; });
  const roots = [];
  pages.forEach(p => {
    if (p.parent && map[p.parent]) {
      map[p.parent].children.push(map[p.url]);
    } else {
      roots.push(map[p.url]);
    }
  });
  function sortNode(node) {
    node.children.sort((a, b) => a.url.localeCompare(b.url));
    node.children.forEach(sortNode);
  }
  roots.forEach(sortNode);
  return roots;
}

function IssueTag({ type }) {
  const meta = ISSUE_META[type] || { label: type, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40`, fontFamily: "monospace", whiteSpace: "nowrap" }}>{meta.label}</span>;
}

function StatCard({ value, label, color = "#f1f5f9" }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1e2d45", borderRadius: 10, padding: "14px 20px", minWidth: 110 }}>
      <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function MapNode({ node, onSelect, selectedUrl, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(depth >= 2);
  const hasChildren = node.children.length > 0;
  const hasIssues = node.issues.length > 0;
  const isSelected = selectedUrl === node.url;
  const depthColor = getDepthColor(node.depth);
  const isBroken = node.issues.some(i => i.type === "broken");
  const isOrphan = node.issues.some(i => i.type === "orphan");
  const borderColor = isBroken ? "#ef4444" : isOrphan ? "#14b8a6" : hasIssues ? "#f59e0b" : depthColor;
  const bgColor = isBroken ? "rgba(239,68,68,0.1)" : isOrphan ? "rgba(20,184,166,0.08)" : hasIssues ? "rgba(245,158,11,0.06)" : `${depthColor}18`;
  const label = node.title ? (node.title.length > 26 ? node.title.slice(0, 26) + "…" : node.title) : shortPath(node.url);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        onClick={() => onSelect(node)}
        style={{
          padding: "8px 14px", borderRadius: 8, border: `1px solid ${borderColor}`,
          background: isSelected ? `${depthColor}30` : bgColor,
          cursor: "pointer", textAlign: "center",
          minWidth: depth === 0 ? 160 : 110, maxWidth: 180,
          boxShadow: isSelected ? `0 0 0 2px ${depthColor}` : "none",
          transition: "all 0.15s", position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 5, right: 6, width: 6, height: 6, borderRadius: "50%", background: node.status_code === 200 ? "#10b981" : node.status_code === 404 ? "#ef4444" : "#f59e0b" }} />
        <div style={{ fontSize: depth === 0 ? 13 : 11, fontWeight: 600, color: depthColor, lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 9, color: "#475569", fontFamily: "monospace", marginTop: 3 }}>{shortPath(node.url)}</div>
        {hasIssues && <div style={{ fontSize: 9, color: borderColor, marginTop: 3 }}>⚠️ {node.issues.length} issue{node.issues.length > 1 ? "s" : ""}</div>}
      </div>

      {hasChildren && (
        <button onClick={e => { e.stopPropagation(); setCollapsed(!collapsed); }}
          style={{ background: CONN, border: "none", color: "#94a3b8", cursor: "pointer", width: 18, height: 18, borderRadius: "50%", fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >{collapsed ? "+" : "−"}</button>
      )}

      {hasChildren && !collapsed && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 2, height: 16, background: CONN }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 12, position: "relative", paddingTop: 18 }}>
              {node.children.length > 1 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: CONN }} />}
              {node.children.map(child => (
                <div key={child.url} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 2, height: 18, background: CONN }} />
                  <MapNode node={child} onSelect={onSelect} selectedUrl={selectedUrl} depth={depth + 1} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {hasChildren && collapsed && <div style={{ fontSize: 9, color: "#475569", marginTop: 2, fontFamily: "monospace" }}>+{node.children.length} pages</div>}
    </div>
  );
}

function MapView({ pages, onSelect, selectedUrl }) {
  const roots = useMemo(() => buildTree(pages), [pages]);
  return (
    <div style={{ overflowX: "auto", padding: "32px 40px 64px" }}>
      <div style={{ display: "inline-flex", gap: 32, alignItems: "flex-start", minWidth: "max-content" }}>
        {roots.map(root => <MapNode key={root.url} node={root} onSelect={onSelect} selectedUrl={selectedUrl} depth={0} />)}
      </div>
      <div style={{ marginTop: 24, fontSize: 11, color: "#334155", textAlign: "center" }}>
        Click any node to inspect · Click +/− to expand/collapse ·
        <span style={{ color: "#10b981" }}> ● 200</span>
        <span style={{ color: "#ef4444" }}> ● 404</span>
        <span style={{ color: "#f59e0b" }}> ● other</span>
      </div>
    </div>
  );
}

function PageRow({ page, onClick, selected }) {
  return (
    <div onClick={() => onClick(page)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid #0f172a", cursor: "pointer", background: selected ? "#1e2d45" : page.issues.length > 0 ? "rgba(239,68,68,0.03)" : "transparent" }}>
      <div style={{ width: 3, height: 32, borderRadius: 2, background: getDepthColor(page.depth), flexShrink: 0 }} />
      <div style={{ fontSize: 10, color: getDepthColor(page.depth), fontFamily: "monospace", width: 16, flexShrink: 0, textAlign: "center" }}>L{page.depth}</div>
      <div style={{ fontSize: 11, fontFamily: "monospace", width: 36, flexShrink: 0, color: page.status_code === 200 ? "#10b981" : page.status_code === 404 ? "#ef4444" : "#f59e0b" }}>{page.status_code || "ERR"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{page.title || shortPath(page.url)}</div>
        <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shortPath(page.url)}</div>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 300 }}>
        {page.issues.slice(0, 3).map((issue, i) => <IssueTag key={i} type={issue.type} />)}
        {page.issues.length > 3 && <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>+{page.issues.length - 3}</span>}
      </div>
    </div>
  );
}

function PageDetail({ page, onClose }) {
  if (!page) return null;
  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 360, background: "#0f172a", borderLeft: "1px solid #1e2d45", overflowY: "auto", zIndex: 50, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontFamily: "monospace", color: "#64748b" }}>Page Details</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20 }}>×</button>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 4, lineHeight: 1.4 }}>{page.title || "(No Title)"}</div>
      <a href={page.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontFamily: "monospace", color: "#3b82f6", wordBreak: "break-all", display: "block", marginBottom: 20 }}>{shortPath(page.url)}</a>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[["Status", page.status_code||"Err", page.status_code===200?"#10b981":"#ef4444"],["Depth",`Level ${page.depth}`,getDepthColor(page.depth)],["Inbound",page.inbound_count,"#f1f5f9"],["Children",page.child_count,"#f1f5f9"],["H1 Tags",page.h1_count,page.h1_count===1?"#10b981":"#f59e0b"],["Schema",page.has_schema?"✓ Yes":"✗ None",page.has_schema?"#10b981":"#ef4444"]].map(([label,value,color])=>(
          <div key={label} style={{ background: "#111827", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e2d45" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div>
          </div>
        ))}
      </div>
      {page.meta_description && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontFamily: "monospace" }}>META DESCRIPTION</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, background: "#111827", padding: "10px 12px", borderRadius: 8, border: "1px solid #1e2d45" }}>{page.meta_description}</div>
        </div>
      )}
      {page.schema_types?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontFamily: "monospace" }}>SCHEMA TYPES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {page.schema_types.map((t,i)=><span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)", fontFamily: "monospace" }}>{t}</span>)}
          </div>
        </div>
      )}
      {page.issues.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, fontFamily: "monospace" }}>ISSUES ({page.issues.length})</div>
          {page.issues.map((issue,i)=>{
            const meta = ISSUE_META[issue.type]||{color:"#94a3b8",bg:"rgba(148,163,184,0.1)"};
            return <div key={i} style={{ marginBottom: 6, padding: "8px 12px", borderRadius: 7, background: meta.bg, border: `1px solid ${meta.color}30` }}><div style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>{meta.label||issue.type}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{issue.message}</div></div>;
          })}
        </div>
      )}
    </div>
  );
}

const EMPTY = { summary: { total_pages: 0, max_depth: 0, pages_with_issues: 0, issue_counts: {}, crawled_at: null, crawl_duration_seconds: 0, total_issues: 0 }, pages: [] };

export default function Dashboard() {
  const [crawlData, setCrawlData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("map");
  const [search, setSearch] = useState("");
  const [filterIssue, setFilterIssue] = useState("all");
  const [filterDepth, setFilterDepth] = useState("all");
  const [selectedPage, setSelectedPage] = useState(null);
  const [sortBy, setSortBy] = useState("depth");

  const fetchData = () => {
    setLoading(true);
    fetch(`/crawl-data.json?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { setCrawlData(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const { summary, pages } = crawlData;
  const maxDepth = summary.max_depth || 0;

  const filtered = useMemo(() => {
    let result = pages;
    if (search) { const q = search.toLowerCase(); result = result.filter(p => p.url.toLowerCase().includes(q)||(p.title||"").toLowerCase().includes(q)); }
    if (filterIssue !== "all") result = result.filter(p => p.issues.some(i => i.type === filterIssue));
    if (filterDepth !== "all") result = result.filter(p => p.depth === parseInt(filterDepth));
    return [...result].sort((a,b) => sortBy==="depth" ? a.depth-b.depth||a.url.localeCompare(b.url) : sortBy==="issues" ? b.issues.length-a.issues.length : sortBy==="inbound" ? b.inbound_count-a.inbound_count : a.status_code-b.status_code);
  }, [pages, search, filterIssue, filterDepth, sortBy]);

  const inputStyle = { background: "#111827", border: "1px solid #1e2d45", color: "#e2e8f0", borderRadius: 7, padding: "7px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" };

  return (
    <>
      <Head>
        <title>LEX Site Map</title>
        <meta name="robots" content="noindex" />
        <style>{`@keyframes shimmer { 0%{background-position:200%} 100%{background-position:-200%} }`}</style>
      </Head>
      <div style={{ background: "#0a0e1a", minHeight: "100vh", color: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif", marginRight: selectedPage ? 360 : 0, transition: "margin-right 0.2s" }}>

        {/* Header */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #1e2d45", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(8px)" }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>Site Map</span>
          <span style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>LEX Air Conditioning</span>
          <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
            {["map","list"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ background: view===v?"#1e2d45":"transparent", border: `1px solid ${view===v?"#3b82f6":"#1e2d45"}`, color: view===v?"#e2e8f0":"#64748b", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>
                {v === "map" ? "🗺 Map View" : "☰ List View"}
              </button>
            ))}
          </div>
          <button onClick={fetchData} disabled={loading} style={{ marginLeft: "auto", background: loading ? "transparent" : "rgba(59,130,246,0.1)", border: "1px solid #1e2d45", color: loading ? "#475569" : "#3b82f6", borderRadius: 7, padding: "5px 12px", fontSize: 11, cursor: loading ? "default" : "pointer", fontFamily: "monospace" }}>
            {loading ? "⟳ Loading…" : "⟳ Refresh"}
          </button>
          <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>Last crawl: {formatDate(summary.crawled_at)}</div>
        </div>

        {/* Loading bar */}
        {loading && <div style={{ height: 2, background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)", backgroundSize: "200%", animation: "shimmer 1.2s infinite" }} />}

        {/* Stats */}
        <div style={{ padding: "16px 24px", display: "flex", gap: 12, flexWrap: "wrap", borderBottom: "1px solid #1e2d45" }}>
          <StatCard value={summary.total_pages} label="Pages Crawled" />
          <StatCard value={maxDepth} label="Max Depth" />
          <StatCard value={summary.pages_with_issues} label="Pages w/ Issues" color={summary.pages_with_issues > 0 ? "#f59e0b" : "#10b981"} />
          <StatCard value={summary.issue_counts?.broken||0} label="Broken (404)" color={(summary.issue_counts?.broken||0)>0?"#ef4444":"#10b981"} />
          <StatCard value={summary.issue_counts?.orphan||0} label="Orphaned" color={(summary.issue_counts?.orphan||0)>0?"#14b8a6":"#10b981"} />
          <StatCard value={summary.issue_counts?.missing_meta||0} label="Missing Meta" color={(summary.issue_counts?.missing_meta||0)>0?"#f59e0b":"#10b981"} />
          <StatCard value={summary.issue_counts?.no_schema||0} label="No Schema" color={(summary.issue_counts?.no_schema||0)>0?"#8b5cf6":"#10b981"} />
        </div>

        {/* Issue pills */}
        {Object.keys(summary.issue_counts||{}).length > 0 && (
          <div style={{ padding: "10px 24px", borderBottom: "1px solid #1e2d45", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(summary.issue_counts).map(([type, count]) => {
              const meta = ISSUE_META[type]||{label:type,color:"#94a3b8",bg:"rgba(148,163,184,0.1)"};
              return <button key={type} onClick={()=>{ setFilterIssue(filterIssue===type?"all":type); setView("list"); }} style={{ background:filterIssue===type?meta.bg:"transparent", border:`1px solid ${filterIssue===type?meta.color:"#1e2d45"}`, color:filterIssue===type?meta.color:"#64748b", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"monospace", transition:"all 0.15s" }}>{meta.label}: {count}</button>;
            })}
          </div>
        )}

        {/* Views */}
        {view === "map" && <MapView pages={pages} onSelect={setSelectedPage} selectedUrl={selectedPage?.url} />}
        {view === "list" && (
          <>
            <div style={{ padding: "12px 24px", borderBottom: "1px solid #1e2d45", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input style={{ ...inputStyle, width: 260 }} placeholder="Search pages…" value={search} onChange={e=>setSearch(e.target.value)} />
              <select style={inputStyle} value={filterDepth} onChange={e=>setFilterDepth(e.target.value)}>
                <option value="all">All Depths</option>
                {Array.from({length:maxDepth+1},(_,i)=>i).map(d=><option key={d} value={d}>Level {d}</option>)}
              </select>
              <select style={inputStyle} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="depth">Sort: Depth</option>
                <option value="issues">Sort: Most Issues</option>
                <option value="inbound">Sort: Inbound Links</option>
                <option value="status">Sort: Status Code</option>
              </select>
              <div style={{ marginLeft: "auto", fontSize: 12, color: "#475569" }}>{filtered.length} of {pages.length} pages</div>
            </div>
            {filtered.map(page=><PageRow key={page.url} page={page} onClick={setSelectedPage} selected={selectedPage?.url===page.url} />)}
            {filtered.length===0 && <div style={{ padding:48, textAlign:"center", color:"#475569", fontSize:14 }}>No pages match.</div>}
          </>
        )}
           </div>
      {selectedPage && <PageDetail page={selectedPage} onClose={()=>setSelectedPage(null)} />}
    </>
  );
}
