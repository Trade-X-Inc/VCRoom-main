CREATE TABLE IF NOT EXISTS csp_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  document_uri TEXT,
  violated_directive TEXT,
  blocked_uri TEXT,
  source_file TEXT,
  line_number INTEGER,
  user_agent TEXT,
  disposition TEXT
);

CREATE INDEX IF NOT EXISTS idx_csp_reports_received_at ON csp_reports (received_at);
CREATE INDEX IF NOT EXISTS idx_csp_reports_violated_directive ON csp_reports (violated_directive);
