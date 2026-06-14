export type SourceType = "local" | "github";
export type FileKind = "concept" | "index" | "log" | "auxiliary";
export type LinkStatus = "resolved" | "unresolved" | "external" | "unsupported" | "case-mismatch";
export type FindingSeverity = "error" | "warning" | "info";
export type FindingScope = "bundle" | "file" | "concept" | "link" | "index" | "log" | "cache";

export interface SourceDescriptor {
  type: SourceType;
  id: string;
  rootPath: string;
  ref?: string;
  loadedAt: string;
  displayName?: string;
}

export interface SourceFile {
  path: string;
  kind: FileKind;
  content: string;
  fingerprint: string;
  symlinkSkipped?: boolean;
}

export interface SourceFileSummary {
  path: string;
  kind: FileKind;
  fingerprint: string;
  bytes: number;
}

export interface DirectoryNode {
  path: string;
  name: string;
  depth: number;
  fileCount: number;
  conceptCount: number;
  children: DirectoryNode[];
}

export interface MarkdownHeading {
  depth: number;
  text: string;
  line: number;
}

export interface MarkdownLink {
  href: string;
  text: string;
  line: number;
}

export interface Citation {
  label: string;
  text: string;
  href?: string;
  line: number;
}

export interface IndexEntry {
  section: string;
  title: string;
  href: string;
  description?: string;
  line: number;
}

export interface LogEntry {
  date: string;
  text: string;
  line: number;
}

export interface ConceptLink {
  sourceId: string;
  sourcePath: string;
  rawHref: string;
  text: string;
  status: LinkStatus;
  line: number;
  resolvedPath?: string;
  targetId?: string;
  targetPath?: string;
  externalUrl?: string;
  suggestedPath?: string;
}

export interface ValidationFinding {
  id: string;
  severity: FindingSeverity;
  scope: FindingScope;
  rule: string;
  message: string;
  filePath?: string;
  conceptId?: string;
  field?: string;
  line?: number;
  remediation?: string;
}

export interface ConceptDocument {
  id: string;
  path: string;
  directory: string;
  frontmatter: Record<string, unknown>;
  type?: string;
  title?: string;
  description?: string;
  resource?: string;
  tags: string[];
  timestamp?: string;
  customFrontmatter: Record<string, unknown>;
  body: string;
  raw: string;
  headings: MarkdownHeading[];
  citations: Citation[];
  markdownLinks: MarkdownLink[];
  outgoingLinks: ConceptLink[];
  incomingLinks: ConceptLink[];
  findings: ValidationFinding[];
}

export interface ReservedFile {
  path: string;
  kind: "index" | "log";
  directory: string;
  body: string;
  raw: string;
  okfVersion?: string;
  headings: MarkdownHeading[];
  links: MarkdownLink[];
  indexEntries: IndexEntry[];
  logEntries: LogEntry[];
  findings: ValidationFinding[];
}

export interface AuxiliaryFile {
  path: string;
  kind: "README";
  directory: string;
  body: string;
  raw: string;
  headings: MarkdownHeading[];
  links: MarkdownLink[];
}

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  directory: string;
  type?: string;
  unresolved?: boolean;
  findingCount: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  status: LinkStatus;
  label: string;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: Array<{ directory: string; nodeIds: string[] }>;
  largeGraph: boolean;
}

export interface SearchEntry {
  conceptId: string;
  field: string;
  label: string;
  value: string;
}

export interface BundleMetrics {
  markdownFiles: number;
  concepts: number;
  indexes: number;
  logs: number;
  auxiliary: number;
  directories: number;
  maxDepth: number;
  withResources: number;
  withCitations: number;
  brokenLinks: number;
  missingRecommendedFields: number;
  uniqueTypes: number;
  uniqueTags: number;
  errors: number;
  warnings: number;
  info: number;
  passed: number;
}

export interface BundleFacets {
  types: Array<{ value: string; count: number }>;
  tags: Array<{ value: string; count: number }>;
  directories: Array<{ value: string; count: number }>;
}

export interface CacheMetadata {
  sourceId: string;
  contentFingerprint: string;
  createdAt: string;
  expiresAt: string;
  cacheHit: boolean;
}

export interface BundleSnapshot {
  source: SourceDescriptor;
  okfVersion?: string;
  files: SourceFileSummary[];
  directories: DirectoryNode[];
  concepts: ConceptDocument[];
  reservedFiles: ReservedFile[];
  auxiliaryFiles: AuxiliaryFile[];
  links: ConceptLink[];
  graph: GraphSnapshot;
  findings: ValidationFinding[];
  cache: CacheMetadata;
  metrics: BundleMetrics;
  facets: BundleFacets;
  searchIndex: SearchEntry[];
}

export interface SourceInventory {
  source: SourceDescriptor;
  files: SourceFile[];
  warnings: ValidationFinding[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
