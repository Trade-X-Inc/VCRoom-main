# Document Intelligence Centre — Database Schema

## Required Tables

### 1. `document_templates` table
Defines all available document templates for different stages.

**Columns:**
```sql
id                UUID PRIMARY KEY
slug              TEXT UNIQUE (e.g., "financial-model", "cap-table", "team-bios")
name              TEXT (e.g., "Financial Model", "Cap Table")
category          TEXT (enum: "Market", "Financials", "Team", "Product", "Legal")
description       TEXT OPTIONAL
is_required       BOOLEAN (required for deal room)
stage_relevance   TEXT[] (enum: "Pre-seed", "Seed", "Series A", "Series B")
ai_prompt         TEXT OPTIONAL (for AI extraction guidance)
sort_order        INTEGER
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

**Seeded Templates (15 templates):**
- Problem & Solution
- Financial Model
- Cap Table
- Market Sizing
- Traction Summary
- Team Bios
- Business Model
- Competitive Landscape
- Use of Funds
- Product Roadmap
- Customer References
- Pitch Deck
- Articles/Press
- Incorporation Documents
- Banking & Legal

### 2. `founder_documents` table
Stores founder-created documents and progress.

**Columns:**
```sql
id                 UUID PRIMARY KEY
startup_id         UUID FOREIGN KEY (startups.id)
template_id        UUID FOREIGN KEY (document_templates.id)
template_slug      TEXT (denormalized for convenience)
title              TEXT
content            JSONB (field_key → field_value mapping)
completeness_score INTEGER (0-100)
status             TEXT (enum: "empty", "draft", "ai_extracted", "complete", "needs_review")
file_path          TEXT OPTIONAL (for file uploads)
created_at         TIMESTAMP
updated_at         TIMESTAMP

-- Unique constraint
UNIQUE (startup_id, template_slug)
```

## RLS Policies

**founder_documents:**
- Founders can read/write only their own startup's documents
- Investors can read documents in deal rooms they're members of

## Sample Data Migration

To seed the document_templates table, run:

```sql
INSERT INTO document_templates (id, slug, name, category, is_required, stage_relevance, sort_order) VALUES
  ('uuid-1', 'problem-solution', 'Problem & Solution', 'Market', true, '{Pre-seed,Seed,Series A,Series B}', 1),
  ('uuid-2', 'financial-model', 'Financial Model', 'Financials', true, '{Seed,Series A,Series B}', 2),
  ('uuid-3', 'cap-table', 'Cap Table', 'Financials', true, '{Seed,Series A,Series B}', 3),
  ('uuid-4', 'market-sizing', 'Market Sizing', 'Market', false, '{Seed,Series A}', 4),
  ('uuid-5', 'traction-summary', 'Traction Summary', 'Market', true, '{Seed,Series A,Series B}', 5),
  ('uuid-6', 'team-bios', 'Team Bios', 'Team', true, '{Pre-seed,Seed,Series A,Series B}', 6),
  -- ... additional templates
```

## Notes

- The `content` JSONB column stores dynamic field data based on TEMPLATE_FIELDS definition in the component
- Status progresses: empty → draft → ai_extracted/complete
- Completeness score calculated as: (filled_fields / total_fields) * 100
- AI extraction fills fields from document uploads (via extract-pitch-deck edge function)
