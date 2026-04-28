# Dashboard UI Design Audit for Figma MCP

This audit captures the current UI patterns in `dashboard-ui` and the design inconsistencies to fix in Figma first.

## Priority Surfaces

1. Operations workspace (`operations` tabs, filters, tables, modals)
2. Training classroom and course library
3. Public query and public session join flows

## Existing Design Foundations Found

- Theme tokens already exist in `dashboard-ui/src/styles/theme.css` for colors, spacing, radius, shadows, and typography.
- Shared primitives exist in `dashboard-ui/src/app/components/design-system/`:
  - `Button`
  - `Input` / `Select` / `Textarea`
  - `Card`
  - `Table`
  - `Badge`
  - `EmptyState`
- Most pages already reference token variables (`var(--brand-*)`), which enables direct design-token parity with Figma variables.

## Gaps To Resolve In Figma

## 1) Component Consistency Gaps

- Repeated inline icon-button patterns instead of a reusable icon action component.
- Multiple ad-hoc tab/filter control patterns with slightly different spacing and hierarchy.
- Uneven table cell density and row action alignment across entities.
- Mixed card padding conventions (`Card`, `Card noPadding`, custom `p-*` wrappers) without a single card content spec.

## 2) State Coverage Gaps

- Inconsistent presentation of loading, empty, and error states between pages.
- Missing defined visual state specs for hover/active/focus/disabled across filter and toolbar controls.
- Public session page contains rich states (`loadingGroups`, `pickGroup`, `enterName`, `joining`, `joined`) without a unified state design spec.

## 3) Typography and Spacing Gaps

- Heading/body rhythm differs across screens (especially page intro blocks vs card headers).
- Table and form vertical spacing is not standardized between operations and training surfaces.
- Inline utility styling (for example select fields in page files) bypasses a documented input/select variant system.

## 4) Information Hierarchy Gaps

- Toolbar hierarchy on Operations page can be clearer (primary vs secondary actions).
- Public query fallback and join flow stages need clearer visual emphasis and progression hierarchy.
- Training classroom row expansion (materials manager) needs a more explicit container/state treatment in design spec.

## Figma Implementation Targets (From Audit)

- Define token-driven primitives in Figma that map to current CSS variables:
  - Color roles
  - Type scale
  - Spacing scale
  - Radius and elevation
- Build component set variants:
  - Buttons: `primary`, `secondary`, `danger`, `ghost`, `accent`
  - Inputs: default, focus, error, disabled
  - Cards: default, elevated, section-shell
  - Tables: header, row, interactive row, empty-row
  - Status badges and empty states
- Build screen templates for:
  - Operations list workspace
  - Training classroom
  - Training course library
  - Public session join

## Code Connect Candidate Mapping List

- `dashboard-ui/src/app/components/design-system/Button.tsx` -> `Button`
- `dashboard-ui/src/app/components/design-system/Input.tsx` -> `Input`, `Select`, `Textarea`
- `dashboard-ui/src/app/components/design-system/Card.tsx` -> `Card`
- `dashboard-ui/src/app/components/design-system/Table.tsx` -> `Table`
- `dashboard-ui/src/app/components/design-system/Badge.tsx` -> `Badge`
- `dashboard-ui/src/app/components/design-system/EmptyState.tsx` -> `EmptyState`
