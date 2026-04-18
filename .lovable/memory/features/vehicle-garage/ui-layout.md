---
name: Vehicle Garage UI Layout
description: Single-column vehicle list rows, photo + rego + make/model, red border for expiries, direct insurer call action
type: design
---

The vehicle garage uses a single-column list of full-width rows for clear readability (changed from a 2-column tile grid which truncated make/model text). Each row shows a 56px photo (or fallback icon) on the left, registration number + year/make/model stacked on the right, with a "Call insurer" button below when an insurer phone is on file. Expired documents (WOF/Rego/Insurance) cause the row to use a destructive border and a red "Expired documents" hint label. The trash icon sits in the top-right of each row.
