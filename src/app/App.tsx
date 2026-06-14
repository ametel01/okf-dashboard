import { useMemo, useRef, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { focusGraph } from "../core/graph";
import type {
  BundleSnapshot,
  ConceptDocument,
  FindingSeverity,
  GraphSnapshot,
} from "../core/okf-types";
import { searchConceptIds } from "../core/search";
import { Badge } from "./components/Badge";
import { GraphCanvas } from "./components/GraphCanvas";
import { Icons } from "./components/Icons";
import { MarkdownPanel } from "./components/MarkdownPanel";
import { clearBundleCache, loadGitHubBundle, loadLocalBundle, refreshLocalBundle } from "./lib/api";
import {
  isDirectoryPickerSupported,
  loadBrowserDirectoryBundle,
  loadBrowserFileList,
} from "./lib/browser-source";
import { conceptTitle, formatDate, severityBadge, valueLabel } from "./lib/format";

export default function App() {
  const [bundle, setBundle] = useState<BundleSnapshot | undefined>();
  const [path, setPath] = useState("");
  const [github, setGithub] = useState({ owner: "", repo: "", ref: "main", path: "" });
  const [browserReload, setBrowserReload] = useState<(() => Promise<BundleSnapshot>) | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();

  async function chooseLocalFolder() {
    setLoading(true);
    setError(undefined);
    try {
      const loaded = await loadBrowserDirectoryBundle();
      setBrowserReload(() => loaded.reload);
      setPath("");
      setBundle(loaded.snapshot);
      navigate(`/bundle/${loaded.snapshot.source.id}`);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Folder could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedFolderFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    setError(undefined);
    try {
      const loaded = await loadBrowserFileList(files);
      setBrowserReload(() => loaded.reload);
      setPath("");
      setBundle(loaded.snapshot);
      navigate(`/bundle/${loaded.snapshot.source.id}`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Folder could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function runLoad(source: "local" | "github") {
    setLoading(true);
    setError(undefined);
    try {
      const snapshot =
        source === "local"
          ? await loadLocalBundle(path)
          : await loadGitHubBundle({
              owner: github.owner,
              repo: github.repo,
              ref: github.ref,
              path: github.path || undefined,
            });
      setBrowserReload(undefined);
      setBundle(snapshot);
      navigate(`/bundle/${snapshot.source.id}`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Bundle could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function reloadBundle() {
    if (!bundle) return;
    if (browserReload) {
      setBundle(await browserReload());
      return;
    }
    if (bundle.source.type !== "local") return;
    const snapshot = await refreshLocalBundle(bundle.source.id, bundle.source.rootPath);
    setBundle(snapshot);
  }

  async function clearCache() {
    await clearBundleCache(bundle?.source.id);
    if (bundle?.source.type === "local") await reloadBundle();
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <Icons.boxes aria-hidden="true" />
          <div>
            <strong>OKF Dashboard</strong>
            <span>Explore. Validate. Understand.</span>
          </div>
        </div>
        <div className="sidebar-section">
          <span className="sidebar-label">Bundle</span>
          <div className="source-pill">
            <Icons.database aria-hidden="true" />
            <div>
              <strong>{bundle?.source.displayName ?? "No bundle loaded"}</strong>
              <span>{bundle?.source.type === "github" ? "Public GitHub" : "Local Folder"}</span>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Primary">
          <SidebarLink
            to={bundle ? `/bundle/${bundle.source.id}` : "/"}
            icon={Icons.home}
            label="Overview"
          />
          <SidebarLink
            to={bundle ? `/bundle/${bundle.source.id}/concepts` : "/"}
            icon={Icons.book}
            label="Concepts"
          />
          <SidebarLink
            to={bundle ? `/bundle/${bundle.source.id}/graph` : "/"}
            icon={Icons.network}
            label="Graph"
          />
          <SidebarLink
            to={bundle ? `/bundle/${bundle.source.id}/source` : "/"}
            icon={Icons.folder}
            label="Indexes"
          />
          <SidebarLink
            to={bundle ? `/bundle/${bundle.source.id}/validation` : "/"}
            icon={Icons.shield}
            label="Validation"
          />
        </nav>
        <div className="source-card">
          <span className="sidebar-label">Source</span>
          <dl>
            <dt>Type</dt>
            <dd>{bundle?.source.type ?? "Local Directory"}</dd>
            <dt>Path</dt>
            <dd>{bundle?.source.rootPath ?? (path || "Not loaded")}</dd>
            <dt>Loaded</dt>
            <dd>{formatDate(bundle?.source.loadedAt)}</dd>
          </dl>
          <button
            className="button button-inverse"
            disabled={!bundle || bundle.source.type !== "local"}
            onClick={reloadBundle}
            type="button"
          >
            <Icons.refresh aria-hidden="true" size={16} /> Reload Bundle
          </button>
        </div>
        <div className="sidebar-footer">
          <Icons.boxes aria-hidden="true" />
          <div>
            <strong>OKF Dashboard</strong>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
      <main className="app-main">
        <div className="page-frame">
          <Routes>
            <Route
              element={
                <HomePage
                  error={error}
                  github={github}
                  loading={loading}
                  path={path}
                  pickerSupported={isDirectoryPickerSupported()}
                  setGithub={setGithub}
                  setPath={setPath}
                  onClearCache={clearCache}
                  onChooseFolder={chooseLocalFolder}
                  onFolderFilesSelected={loadSelectedFolderFiles}
                  onLoad={runLoad}
                />
              }
              path="/"
            />
            <Route
              element={
                <BundleLayout bundle={bundle} onClearCache={clearCache} onReload={reloadBundle} />
              }
              path="/bundle/:sourceId/*"
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
}: { to: string; icon: typeof Icons.home; label: string }) {
  return (
    <NavLink className="sidebar-nav-item" to={to}>
      <Icon aria-hidden="true" size={18} />
      {label}
    </NavLink>
  );
}

function HomePage(props: {
  path: string;
  setPath: (path: string) => void;
  github: { owner: string; repo: string; ref: string; path: string };
  setGithub: (value: { owner: string; repo: string; ref: string; path: string }) => void;
  loading: boolean;
  error?: string;
  pickerSupported: boolean;
  onChooseFolder: () => void;
  onFolderFilesSelected: (files: FileList | null) => void;
  onLoad: (source: "local" | "github") => void;
  onClearCache: () => void;
}) {
  const fallbackFolderInputRef = useRef<HTMLInputElement | null>(null);
  const directoryInputProps = { directory: "", webkitdirectory: "" };

  return (
    <>
      <PageHeader
        title="Load OKF Bundle"
        status="Ready"
        sourcePath={props.path || "Choose a local folder or enter a trusted server path"}
      />
      <div className="load-grid">
        <section className="card">
          <div className="card-header">
            <h2>Local Source</h2>
            <Badge tone={props.pickerSupported ? "success" : "warning"}>
              {props.pickerSupported ? "Folder picker" : "File picker"}
            </Badge>
          </div>
          <div className="card-body stack">
            <button
              className="button button-primary"
              disabled={props.loading}
              onClick={() => {
                if (props.pickerSupported) {
                  props.onChooseFolder();
                } else {
                  fallbackFolderInputRef.current?.click();
                }
              }}
              type="button"
            >
              {props.loading ? (
                <Icons.loader aria-hidden="true" className="spin" size={16} />
              ) : (
                <Icons.folder aria-hidden="true" size={16} />
              )}
              Choose Folder
            </button>
            <input
              ref={fallbackFolderInputRef}
              className="visually-hidden"
              type="file"
              multiple
              onChange={(event) => {
                props.onFolderFilesSelected(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
              {...directoryInputProps}
            />
            <label className="field-label" htmlFor="local-path">
              Or enter a server-readable bundle path
            </label>
            <input
              className="search-input"
              id="local-path"
              placeholder="/path/to/okf-bundle"
              onChange={(event) => props.setPath(event.target.value)}
              value={props.path}
            />
            <div className="actions-row">
              <button
                className="button"
                disabled={props.loading || props.path.trim().length === 0}
                onClick={() => props.onLoad("local")}
                type="button"
              >
                <Icons.upload aria-hidden="true" size={16} />
                Load Path
              </button>
              <button className="button" onClick={props.onClearCache} type="button">
                <Icons.refresh aria-hidden="true" size={16} /> Clear Cache
              </button>
            </div>
            {props.error ? <p className="inline-error">{props.error}</p> : null}
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <h2>Public GitHub</h2>
            <Badge tone="violet">Snapshot import</Badge>
          </div>
          <div className="card-body form-grid">
            <input
              aria-label="GitHub owner"
              className="search-input"
              placeholder="owner"
              value={props.github.owner}
              onChange={(event) => props.setGithub({ ...props.github, owner: event.target.value })}
            />
            <input
              aria-label="GitHub repository"
              className="search-input"
              placeholder="repo"
              value={props.github.repo}
              onChange={(event) => props.setGithub({ ...props.github, repo: event.target.value })}
            />
            <input
              aria-label="GitHub ref"
              className="search-input"
              placeholder="ref"
              value={props.github.ref}
              onChange={(event) => props.setGithub({ ...props.github, ref: event.target.value })}
            />
            <input
              aria-label="Bundle subpath"
              className="search-input"
              placeholder="bundle path"
              value={props.github.path}
              onChange={(event) => props.setGithub({ ...props.github, path: event.target.value })}
            />
            <button
              className="button"
              disabled={!props.github.owner || !props.github.repo || props.loading}
              onClick={() => props.onLoad("github")}
              type="button"
            >
              <Icons.github aria-hidden="true" size={16} /> Load Public Repo
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function BundleLayout({
  bundle,
  onReload,
  onClearCache,
}: { bundle?: BundleSnapshot; onReload: () => void; onClearCache: () => void }) {
  const { sourceId } = useParams();
  if (!bundle || bundle.source.id !== sourceId) return <Navigate to="/" replace />;
  return (
    <>
      <PageHeader
        title={bundle.source.displayName ?? "OKF Bundle"}
        status={bundle.metrics.errors > 0 ? "Issues Found" : "Valid with Issues"}
        sourcePath={bundle.source.rootPath}
        actions={
          <>
            <button className="button" onClick={onReload} type="button">
              <Icons.refresh aria-hidden="true" size={16} /> Reload
            </button>
            <button
              className="button button-icon"
              aria-label="Clear cache"
              title="Clear cache"
              onClick={onClearCache}
              type="button"
            >
              <Icons.x aria-hidden="true" size={16} />
            </button>
          </>
        }
      />
      <nav className="tabs" aria-label="Bundle views">
        <Tab to={`/bundle/${bundle.source.id}`} label="Overview" end />
        <Tab to={`/bundle/${bundle.source.id}/concepts`} label="Concepts" />
        <Tab to={`/bundle/${bundle.source.id}/graph`} label="Graph" />
        <Tab to={`/bundle/${bundle.source.id}/source`} label="Indexes" />
        <Tab to={`/bundle/${bundle.source.id}/validation`} label="Validation" />
      </nav>
      <Routes>
        <Route element={<Overview bundle={bundle} />} index />
        <Route element={<ConceptList bundle={bundle} />} path="concepts" />
        <Route element={<ConceptDetail bundle={bundle} />} path="concepts/:conceptId" />
        <Route element={<GraphView bundle={bundle} />} path="graph" />
        <Route element={<ValidationView bundle={bundle} />} path="validation" />
        <Route element={<SourceContextView bundle={bundle} />} path="source" />
      </Routes>
    </>
  );
}

function PageHeader({
  title,
  status,
  sourcePath,
  actions,
}: { title: string; status: string; sourcePath: string; actions?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <div className="title-row">
          <h1 className="page-title">{title}</h1>
          <Badge tone={status.includes("Issue") ? "warning" : "success"}>{status}</Badge>
        </div>
        <p className="source-path">{sourcePath}</p>
      </div>
      <div className="actions-row">{actions}</div>
    </header>
  );
}

function Tab({ to, label, end = false }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink className="tab" end={end} to={to}>
      {label}
    </NavLink>
  );
}

function Overview({ bundle }: { bundle: BundleSnapshot }) {
  const recent = [...bundle.concepts]
    .sort((left, right) => Date.parse(right.timestamp ?? "") - Date.parse(left.timestamp ?? ""))
    .slice(0, 8);
  return (
    <>
      <section className="overview-grid">
        <Card title="Bundle Summary">
          <div className="metric-grid">
            <Metric icon={Icons.file} label="Markdown Files" value={bundle.metrics.markdownFiles} />
            <Metric icon={Icons.book} label="Concepts" value={bundle.metrics.concepts} />
            <Metric icon={Icons.folder} label="Indexes" value={bundle.metrics.indexes} />
            <Metric icon={Icons.fileCode} label="Logs" value={bundle.metrics.logs} />
            <Metric icon={Icons.folder} label="Directories" value={bundle.metrics.directories} />
            <Metric icon={Icons.network} label="Max Depth" value={bundle.metrics.maxDepth} />
            <Metric icon={Icons.link} label="With Resources" value={bundle.metrics.withResources} />
            <Metric icon={Icons.tags} label="With Citations" value={bundle.metrics.withCitations} />
            <Metric icon={Icons.x} label="Broken Links" value={bundle.metrics.brokenLinks} />
            <Metric
              icon={Icons.alert}
              label="Missing Fields"
              value={bundle.metrics.missingRecommendedFields}
            />
            <Metric icon={Icons.tag} label="Unique Types" value={bundle.metrics.uniqueTypes} />
            <Metric icon={Icons.tags} label="Unique Tags" value={bundle.metrics.uniqueTags} />
          </div>
        </Card>
        <Card title="Distributions">
          <Distribution bundle={bundle} />
        </Card>
      </section>
      <section className="overview-lower-grid">
        <Card title="Directory Tree">
          <DirectoryTree bundle={bundle} />
        </Card>
        <Card title="Recently Updated Concepts">
          <ConceptTable concepts={recent} sourceId={bundle.source.id} compact />
        </Card>
        <Card title="Knowledge Graph">
          <GraphCanvas graph={focusGraph(bundle.graph, { limit: 24 })} />
          <NavLink className="button full-width" to={`/bundle/${bundle.source.id}/graph`}>
            Open Full Graph View
          </NavLink>
        </Card>
      </section>
      <section className="overview-activity">
        <Card title="Recent Activity">
          <ActivityList bundle={bundle} />
        </Card>
      </section>
      <ValidationStrip bundle={bundle} />
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: { icon: typeof Icons.file; label: string; value: number | string }) {
  return (
    <div className="metric-tile">
      <span className="metric-label">
        <Icon aria-hidden="true" size={16} /> {label}
      </span>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}

function Distribution({ bundle }: { bundle: BundleSnapshot }) {
  const typeFacets = bundle.facets.types.slice(0, 8);
  const tagFacets = bundle.facets.tags.slice(0, 10);
  const typeTotal = Math.max(
    1,
    bundle.facets.types.reduce((sum, facet) => sum + facet.count, 0),
  );
  const maxTagCount = Math.max(1, ...tagFacets.map((facet) => facet.count));
  return (
    <div className="distribution-grid">
      <div className="distribution-types">
        <h3>By Type (Top 8)</h3>
        <div className="type-distribution-body">
          <div
            className="donut-chart"
            aria-label="Type distribution donut chart"
            style={{ background: distributionGradient(typeFacets, typeTotal) }}
          />
          <div className="legend-list">
            {typeFacets.map((facet, index) => (
              <div className="legend-row" key={facet.value}>
                <span
                  className="legend-swatch"
                  style={{ background: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length] }}
                />
                <span>{facet.value}</span>
                <strong>{Math.round((facet.count / typeTotal) * 100)}%</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="distribution-tags">
        <h3>By Tags (Top 10)</h3>
        <div className="bar-list">
          {tagFacets.map((facet) => (
            <div className="bar-row" key={facet.value}>
              <span>{facet.value}</span>
              <i
                style={{
                  width: `${Math.max(14, (facet.count / maxTagCount) * 100)}%`,
                }}
              />
              <strong>{facet.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DISTRIBUTION_COLORS = [
  "#3b82f6",
  "#38bdf8",
  "#73b66b",
  "#f87171",
  "#fb923c",
  "#22c55e",
  "#8b5cf6",
  "#94a3b8",
];

function distributionGradient(
  facets: Array<{ value: string; count: number }>,
  total: number,
): string {
  let cursor = 0;
  const segments = facets.map((facet, index) => {
    const start = cursor;
    cursor += (facet.count / total) * 100;
    const color = DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length];
    return `${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function ActivityList({ bundle }: { bundle: BundleSnapshot }) {
  const entries = [
    ["Loaded bundle", bundle.source.displayName ?? bundle.source.rootPath, bundle.source.loadedAt],
    ["Validation completed", `${bundle.findings.length} findings found`, bundle.source.loadedAt],
    ["Parsed files", `${bundle.files.length} Markdown files`, bundle.source.loadedAt],
    [
      "Log entries parsed",
      `${bundle.reservedFiles.flatMap((file) => file.logEntries).length} total entries`,
      bundle.source.loadedAt,
    ],
  ];
  return (
    <ul className="activity-list">
      {entries.map(([title, detail, time]) => (
        <li key={title}>
          <Icons.check aria-hidden="true" size={16} />
          <div>
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
          <time>{formatDate(time)}</time>
        </li>
      ))}
    </ul>
  );
}

function DirectoryTree({ bundle }: { bundle: BundleSnapshot }) {
  return (
    <ul className="tree-list">
      {bundle.facets.directories.map((directory) => (
        <li key={directory.value}>
          <Icons.folder aria-hidden="true" size={16} />
          <span>{directory.value}</span>
          <Badge tone="muted">{directory.count}</Badge>
        </li>
      ))}
    </ul>
  );
}

function ConceptList({ bundle }: { bundle: BundleSnapshot }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const type = params.get("type") ?? "";
  const tag = params.get("tag") ?? "";
  const matches = useMemo(
    () => searchConceptIds(bundle.searchIndex, query),
    [bundle.searchIndex, query],
  );
  const matchIds = new Set(matches.map((match) => match.conceptId));
  const concepts = bundle.concepts.filter((concept) => {
    if (query && !matchIds.has(concept.id)) return false;
    if (type && concept.type !== type) return false;
    if (tag && !concept.tags.includes(tag)) return false;
    return true;
  });
  return (
    <section className="list-layout">
      <div className="toolbar">
        <label className="search-wrap">
          <Icons.search aria-hidden="true" size={16} />
          <input
            className="search-input"
            placeholder="Search concepts..."
            value={query}
            onChange={(event) => setParams(nextParams(params, "q", event.target.value))}
          />
        </label>
        <select
          aria-label="Filter by type"
          className="select"
          value={type}
          onChange={(event) => setParams(nextParams(params, "type", event.target.value))}
        >
          <option value="">All Types</option>
          {bundle.facets.types.map((facet) => (
            <option key={facet.value}>{facet.value}</option>
          ))}
        </select>
        <select
          aria-label="Filter by tag"
          className="select"
          value={tag}
          onChange={(event) => setParams(nextParams(params, "tag", event.target.value))}
        >
          <option value="">All Tags</option>
          {bundle.facets.tags.map((facet) => (
            <option key={facet.value}>{facet.value}</option>
          ))}
        </select>
      </div>
      <Card title={`${concepts.length} Concepts`}>
        <ConceptTable concepts={concepts} sourceId={bundle.source.id} matchLabels={matches} />
      </Card>
    </section>
  );
}

function nextParams(params: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  return next;
}

function ConceptTable({
  concepts,
  sourceId,
  compact = false,
  matchLabels = [],
}: {
  concepts: ConceptDocument[];
  sourceId: string;
  compact?: boolean;
  matchLabels?: Array<{ conceptId: string; label: string }>;
}) {
  const matchById = new Map(matchLabels.map((match) => [match.conceptId, match.label]));
  return (
    <div className="responsive-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>Concept</th>
            <th>Type</th>
            {!compact ? <th>Tags</th> : null}
            <th>Updated</th>
            <th>Validation</th>
          </tr>
        </thead>
        <tbody>
          {concepts.map((concept) => (
            <tr key={concept.id}>
              <td>
                <NavLink to={`/bundle/${sourceId}/concepts/${encodeURIComponent(concept.id)}`}>
                  {conceptTitle(concept)}
                </NavLink>
                <span>{concept.path}</span>
                {matchById.has(concept.id) ? (
                  <Badge tone="primary">{matchById.get(concept.id)}</Badge>
                ) : null}
                {!concept.title ? <Badge tone="muted">derived</Badge> : null}
              </td>
              <td>
                <Badge tone="primary">{concept.type ?? "Unknown"}</Badge>
              </td>
              {!compact ? (
                <td>
                  {concept.tags.map((item) => (
                    <Badge key={item} tone="muted">
                      {item}
                    </Badge>
                  ))}
                </td>
              ) : null}
              <td>{formatDate(concept.timestamp)}</td>
              <td>
                {concept.findings.length ? (
                  <Badge tone="warning">{concept.findings.length} findings</Badge>
                ) : (
                  <Badge tone="success">Valid</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConceptDetail({ bundle }: { bundle: BundleSnapshot }) {
  const { conceptId = "" } = useParams();
  const [mode, setMode] = useState<"rendered" | "raw">("rendered");
  const concept = bundle.concepts.find((item) => item.id === decodeURIComponent(conceptId));
  if (!concept)
    return (
      <Card title="Concept not found">The selected concept does not exist in this snapshot.</Card>
    );
  const related = bundle.concepts
    .filter((item) => item.id !== concept.id && item.tags.some((tag) => concept.tags.includes(tag)))
    .slice(0, 5);
  return (
    <>
      <div className="detail-header">
        <div>
          <p className="breadcrumb">Overview / Concepts / {conceptTitle(concept)}</p>
          <div className="title-row">
            <Icons.file aria-hidden="true" />
            <h2>{conceptTitle(concept)}</h2>
            <Badge tone="primary">{concept.type ?? "Unknown"}</Badge>
            <Badge
              tone={
                concept.findings.some((finding) => finding.severity === "error")
                  ? "danger"
                  : "success"
              }
            >
              {concept.findings.length ? `${concept.findings.length} findings` : "Valid"}
            </Badge>
          </div>
          <p className="source-path">
            {concept.id} · {concept.path}
          </p>
        </div>
        <fieldset className="segmented">
          <legend>Concept view mode</legend>
          <button
            className={mode === "rendered" ? "active" : ""}
            onClick={() => setMode("rendered")}
            type="button"
          >
            Rendered Markdown
          </button>
          <button
            className={mode === "raw" ? "active" : ""}
            onClick={() => setMode("raw")}
            type="button"
          >
            Raw Source
          </button>
        </fieldset>
      </div>
      <section className="detail-main-grid">
        <Card title={mode === "rendered" ? "Rendered Markdown" : "Raw Source"}>
          {mode === "rendered" ? (
            <MarkdownPanel markdown={concept.body} />
          ) : (
            <pre className="raw-source">{concept.raw}</pre>
          )}
        </Card>
        <Card title="Metadata">
          <MetadataTable concept={concept} />
        </Card>
      </section>
      <section className="relationship-grid">
        <RelationshipCard
          title="Outgoing Links"
          links={concept.outgoingLinks.map((link) => link.text || link.rawHref)}
        />
        <RelationshipCard
          title="Incoming Links"
          links={concept.incomingLinks.map((link) => link.sourceId)}
        />
        <RelationshipCard
          title="Citations"
          links={concept.citations.map((citation) => citation.text)}
        />
        <RelationshipCard title="Related Concepts" links={related.map(conceptTitle)} />
      </section>
      <ValidationStrip bundle={bundle} concept={concept} />
    </>
  );
}

function MetadataTable({ concept }: { concept: ConceptDocument }) {
  const rows: Array<[string, unknown]> = [
    ["Type", concept.type],
    ["Title", concept.title],
    ["Description", concept.description],
    ["Resource", concept.resource],
    ["Tags", concept.tags],
    ["Timestamp", concept.timestamp],
    ...Object.entries(concept.customFrontmatter).map<[string, unknown]>(([key, value]) => [
      `Custom: ${key}`,
      value,
    ]),
  ];
  return (
    <table className="metadata-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={String(label)}>
            <th>{label}</th>
            <td>
              {label === "Tags" && Array.isArray(value)
                ? value.map((tag) => (
                    <Badge key={tag} tone="muted">
                      {tag}
                    </Badge>
                  ))
                : valueLabel(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RelationshipCard({ title, links }: { title: string; links: string[] }) {
  return (
    <Card title={title}>
      <ul className="compact-list">
        {links.length ? (
          links.map((link) => <li key={link}>{link}</li>)
        ) : (
          <li className="muted">No entries</li>
        )}
      </ul>
    </Card>
  );
}

function GraphView({ bundle }: { bundle: BundleSnapshot }) {
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState("");
  const graph = useMemo<GraphSnapshot>(
    () => focusGraph(bundle.graph, { query, directory, limit: bundle.graph.largeGraph ? 60 : 100 }),
    [bundle.graph, query, directory],
  );
  return (
    <section className="stack">
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Filter graph..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="select"
          aria-label="Directory"
          value={directory}
          onChange={(event) => setDirectory(event.target.value)}
        >
          <option value="">Focused subgraph</option>
          {bundle.facets.directories.map((facet) => (
            <option key={facet.value}>{facet.value}</option>
          ))}
        </select>
        {bundle.graph.largeGraph ? (
          <Badge tone="warning">Large graph focused to {graph.nodes.length} nodes</Badge>
        ) : null}
      </div>
      <Card title="Relationship Graph">
        <GraphCanvas graph={graph} />
      </Card>
      <Card title="Keyboard Reachable Graph List">
        <ul className="compact-list">
          {graph.nodes.map((node) => (
            <li key={node.id}>
              <strong>{node.label}</strong> <span>{node.path}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function ValidationView({ bundle }: { bundle: BundleSnapshot }) {
  const [severity, setSeverity] = useState<FindingSeverity | "">("");
  const findings = severity
    ? bundle.findings.filter((finding) => finding.severity === severity)
    : bundle.findings;
  return (
    <section className="stack">
      <ValidationStrip bundle={bundle} />
      <div className="toolbar">
        <select
          className="select"
          aria-label="Severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value as FindingSeverity | "")}
        >
          <option value="">All severities</option>
          <option value="error">Errors</option>
          <option value="warning">Warnings</option>
          <option value="info">Info</option>
        </select>
      </div>
      <Card title={`${findings.length} Findings`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Rule</th>
              <th>File</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => (
              <tr key={finding.id}>
                <td>
                  <span className={`badge ${severityBadge(finding.severity)}`}>
                    {finding.severity}
                  </span>
                </td>
                <td>{finding.rule}</td>
                <td>{finding.filePath ?? "bundle"}</td>
                <td>{finding.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function SourceContextView({ bundle }: { bundle: BundleSnapshot }) {
  const files = [...bundle.reservedFiles, ...bundle.auxiliaryFiles];
  const [selectedPath, setSelectedPath] = useState(files[0]?.path ?? "");
  const selected = files.find((file) => file.path === selectedPath);
  return (
    <section className="source-context-grid">
      <Card title="Source Context Files">
        <ul className="tree-list">
          {files.map((file) => (
            <li key={file.path}>
              <button
                className="link-button"
                onClick={() => setSelectedPath(file.path)}
                type="button"
              >
                <Icons.file aria-hidden="true" size={16} /> {file.path}
              </button>
              <Badge tone={file.kind === "README" ? "violet" : "primary"}>
                {file.kind === "README" ? "auxiliary" : file.kind}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
      <Card title={selected?.path ?? "No source context"}>
        <MarkdownPanel
          markdown={selected?.body ?? "No index.md, log.md, or README.md files were found."}
        />
      </Card>
      <Card title="Parsed Outline">
        <ul className="compact-list">
          {selected && "indexEntries" in selected
            ? selected.indexEntries.map((entry) => (
                <li key={`${entry.line}:${entry.href}`}>
                  {entry.section}: {entry.title}
                </li>
              ))
            : null}
          {selected && "logEntries" in selected
            ? selected.logEntries.map((entry) => (
                <li key={`${entry.line}:${entry.text}`}>
                  {entry.date}: {entry.text}
                </li>
              ))
            : null}
          {!selected ? <li>No parsed outline available.</li> : null}
        </ul>
      </Card>
    </section>
  );
}

function ValidationStrip({
  bundle,
  concept,
}: { bundle: BundleSnapshot; concept?: ConceptDocument }) {
  const findings = concept?.findings ?? bundle.findings;
  return (
    <section className="card validation-strip" aria-label="Validation summary">
      <div className="card-body validation-metrics">
        <Metric
          icon={Icons.x}
          label="Errors"
          value={findings.filter((finding) => finding.severity === "error").length}
        />
        <Metric
          icon={Icons.alert}
          label="Warnings"
          value={findings.filter((finding) => finding.severity === "warning").length}
        />
        <Metric
          icon={Icons.help}
          label="Info"
          value={findings.filter((finding) => finding.severity === "info").length}
        />
        <Metric
          icon={Icons.check}
          label="Passed Checks"
          value={concept ? Math.max(0, 4 - findings.length) : bundle.metrics.passed}
        />
      </div>
    </section>
  );
}
