# RexVit Console Architecture

## Product

RexVit Console is a keyboard-first internal API Explorer and API Runner. It discovers OpenAPI and Swagger YAML or JSON files from local folders, indexes services and endpoints, and executes requests through the Tauri backend to avoid browser CORS limitations.

## Runtime Shape

```text
Desktop Shell
  Tauri v2
    Rust command layer
    SQLite persistence
    filesystem discovery
    HTTP runner
  React application
    endpoint explorer
    request builder
    response viewer
    settings and environments
```

## Core Modules

- `src/app`: application providers, error boundaries, global layout wiring.
- `src/features/openapi`: local spec discovery, parsed service and endpoint models, explorer UI.
- `src/features/runner`: request builder, execution state, Tauri runner client.
- `src/features/response-viewer`: content-type-specific response rendering.
- `src/features/environments`: environment selection and variable model.
- `src/features/history`: request history surface and persistence contracts.
- `src/features/favorites`: favorite endpoint model and sidebar surface.
- `src/plugins`: plugin contracts and registry for extensible importers, runners, and viewers.
- `src/services`: app-level service abstractions around Tauri commands.
- `src/shared`: shared types, utilities, and UI-neutral helpers.
- `src/components/ui`: local shadcn/ui-style primitives.
- `src-tauri`: native filesystem, SQLite, and network execution layer.

## Data Flow

1. User selects or configures local folders.
2. Tauri recursively scans folders for `.yaml`, `.yml`, and `.json` specs.
3. Rust stores scan metadata in SQLite and returns discovered specs.
4. React parses specs into service and endpoint summaries.
5. Explorer filters and selects endpoints.
6. Request builder resolves environment variables and sends an execution command to Tauri.
7. Tauri executes HTTP requests with `reqwest`, streams or buffers responses based on size and content type, and returns metadata plus body references.
8. Response viewer chooses the matching renderer by content type.

## Request Identity

RexVit separates four concepts:

- Endpoint Definition: parsed OpenAPI operation metadata.
- Request Instance: executable draft with a durable `requestId`.
- Open Tab: editor focus surface for a request instance.
- Request History: immutable execution snapshot.

OpenAPI request tabs are unique by `serviceId + versionId + endpointId`. Selecting the same endpoint focuses the existing request tab instead of creating a duplicate. Ad-hoc requests use a fresh `req_*` identity every time, so multiple ad-hoc variations can coexist.

Request instances store method, path, server, auth profile, path/query/header params, body, dirty state, and timestamps. Drafts and open tabs are autosaved to local persistence and restored on app startup.

## Request History

History entries are snapshots, not URL-only records. Each execution stores request id, request name, service/version/endpoint ids, server, auth profile, path params, headers, query params, body, response status, response time, and timestamp. Clicking a recent request restores a copy of the exact snapshot into a new request tab.

The frontend history model is sized for 10,000 entries. Large lists should be rendered through virtualized views as the history panel grows beyond the compact recent-request surface.

## OpenAPI Generation

The parser extracts path, query, header, and cookie parameter metadata, including required state, type, description, default, example, and enum values where present. Required query rows are auto-created, auto-enabled, and marked as required in the request builder. Request body defaults are generated from examples or required schema properties when available.

## Persistence

SQLite owns durable internal state:

- discovered spec files
- service metadata
- environments
- favorites
- request history
- settings

The frontend uses Zustand for fast local UI state and TanStack Query for async command cache state.

## Plugin Architecture

Plugins are plain TypeScript registrations:

- `SpecImporter`: adds support for new API spec formats.
- `RequestRunner`: overrides or augments execution behavior.
- `ResponseRenderer`: registers a renderer for additional content types.

Core modules consume plugins through typed registries instead of hard-coded imports.

## Response Viewer Strategy

- JSON: tree view, raw view, syntax highlighting, copy support.
- XML, HTML, text: raw viewer with lazy rendering.
- Images: object URL preview, zoom controls, download action.
- Video: native player with fullscreen support.
- Audio: native audio player.
- PDF: embedded object viewer and download action.
- Binary: metadata and download action.

Large responses are handled through preview limits, virtualization-ready list boundaries, and backend body references for later streaming/download.

## Performance Targets

- Startup under 3 seconds.
- 100+ spec files without blocking initial paint.
- 1000+ endpoints with indexed search and virtualized rendering boundaries.
- Native HTTP execution avoids browser CORS and browser connection policy limits.
- Parsing and scanning are isolated behind async service calls.

## Error Handling

- React error boundary catches rendering failures.
- Global `window` handlers log unhandled promise rejections and runtime errors.
- Tauri commands return structured errors.
- Runner errors include request phase and transport metadata.

## Accessibility

- Dark mode by default with high contrast tokens.
- Keyboard focus rings.
- Semantic controls and labels.
- Compact layouts without hiding essential labels from assistive technology.
