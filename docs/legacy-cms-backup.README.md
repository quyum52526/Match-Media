# Legacy table backup

`legacy-cms-backup.json` is a verbatim dump of two tables that lived in this
project's Supabase database but were never part of the Prisma schema — leftovers
from an earlier portfolio project that shared the same database.

Captured immediately before migration `20260930160000_drop_legacy_tables`
dropped them, so Prisma fully manages the schema with no unmanaged stragglers.

- `cms_entries` — 2 rows (portfolio/showreel CMS entries)
- `portfolio_items` — 0 rows

To restore, recreate the tables from the column list in the dump and insert the
rows. Nothing in MatchMedia reads either table.
