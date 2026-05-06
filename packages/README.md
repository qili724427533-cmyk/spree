# Spree TypeScript Packages

This directory contains the TypeScript side of the Spree monorepo: SDKs, the React admin SPA, the CLI, project scaffolding, and the docs bundle. Everything here is managed with **pnpm workspaces** + **Turbo**, built with **tsup** (or Vite for the admin SPA), tested with **Vitest**, and linted with **Biome**. Versioning for published packages is handled by **Changesets**.

For monorepo-wide conventions (type generation pipeline, code style, testing) see the root [`CLAUDE.md`](../CLAUDE.md). For backend conventions see [`spree/`](../spree/).

## Status legend

| Badge | Meaning |
|---|---|
| **Stable** | Published to npm, follows semver, safe for production. |
| **Developer Preview** | Published to npm but API may change between minor versions. Pin exact versions. |
| **In Development** | Active work for an upcoming Spree release. Not yet published or only published behind a `next` dist-tag. |
| **Internal** | Private to the workspace (`"private": true`), not published. |

## Packages

| Package | npm | Status | Description |
|---|---|---|---|
| [`sdk`](./sdk) | [`@spree/sdk`](https://www.npmjs.com/package/@spree/sdk) | **Stable** (1.x) | TypeScript client for the customer-facing **Store API v3**. |
| [`admin-sdk`](./admin-sdk) | [`@spree/admin-sdk`](https://www.npmjs.com/package/@spree/admin-sdk) | **Developer Preview** (0.x) | TypeScript client for the **Admin API**. Tracks Spree 6.0 development. |
| [`admin`](./admin) | `@spree/admin` (not yet published) | **In Development** | React SPA admin dashboard for Spree 6.0. Will replace the legacy Rails `spree/admin` engine. Currently private in the workspace; will be published as `@spree/admin` once ready. |
| [`sdk-core`](./sdk-core) | — | **Internal** | Shared HTTP/retry/error layer used by `@spree/sdk` and `@spree/admin-sdk`. Not published. |
| [`cli`](./cli) | [`@spree/cli`](https://www.npmjs.com/package/@spree/cli) | **Stable** (2.x) | Docker-based CLI for managing Spree projects scaffolded with `create-spree-app`. |
| [`create-spree-app`](./create-spree-app) | [`create-spree-app`](https://www.npmjs.com/package/create-spree-app) | **Stable** (1.x) | One-shot scaffolder: `npx create-spree-app my-store`. Sets up backend (Docker) + optional Next.js storefront. |
| [`docs`](./docs) | [`@spree/docs`](https://www.npmjs.com/package/@spree/docs) | **Developer Preview** (0.x) | Spree developer documentation packaged for local access by AI agents and dev tools. |

### `@spree/sdk` — Store API client

The customer-facing SDK. Powers storefronts (Next.js or otherwise) and any client that needs read access to the catalog plus write access to carts, customers, addresses, and checkout. Auth modes: publishable key (guest) or JWT (logged-in customer).

Includes auto-generated TypeScript types and Zod schemas derived from the Rails Alba serializers — see the [type generation pipeline](../CLAUDE.md#type-generation-pipeline) in the root docs.

### `@spree/admin-sdk` — Admin API client

The back-office counterpart to `@spree/sdk`. Same patterns, but targets the Admin API and supports both **secret API key** (server-to-server, scope-based authorization) and **JWT** (admin user, CanCanCan-based authorization) auth modes. Used internally by the `@spree/admin` SPA and externally by integrations and admin tooling.

This package is in **Developer Preview** alongside the Spree 6.0 Admin API. Expect breaking changes between minor versions until 1.0.

### `@spree/admin` — React admin SPA

The Spree 6.0 admin dashboard. Vite + TanStack Router (file-based) + TanStack Query + React Hook Form + shadcn/ui + Base UI + Tailwind. All data flows through `@spree/admin-sdk`; there are no direct backend calls.

Architecture, extension points (table registry, navigation registry, component injection), and migration plan are documented in [`docs/plans/6.0-admin-spa.md`](../docs/plans/6.0-admin-spa.md). Local setup instructions live in [`packages/admin/README.md`](./admin/README.md).

The package is currently private in the workspace; it will be published to npm as `@spree/admin` alongside the Spree 6.0 release.

### `@spree/sdk-core` — Shared internals

Private package. Provides `createRequestFn()`, `SpreeError`, retry logic, and Ransack query-param transformation (`transformListParams()`). Consumed by both SDKs; not intended for direct use.

### `@spree/cli` — Project management CLI

Docker-based commands for projects scaffolded via `create-spree-app`: starting/stopping services, running migrations, opening Rails consoles, loading sample data, etc. Bundled automatically into new projects.

### `create-spree-app` — Project scaffolder

The recommended entry point for new Spree projects. Clones [`spree/spree-starter`](https://github.com/spree/spree-starter), wires up Docker Compose, optionally adds the Next.js storefront, and runs first-time setup. Replaces the legacy in-repo `server/` directory.

### `@spree/docs` — Documentation bundle

Spree developer documentation (core concepts, customization, API reference, integration guides) packaged as plain Markdown so AI agents and offline tooling can read it from `node_modules/@spree/docs/dist/`. Built from the `docs/` tree at the repo root.

## Working in the monorepo

From the repo root:

```bash
pnpm install      # install workspace deps
pnpm build        # turbo-cached build for all packages
pnpm test         # run all package tests
pnpm typecheck    # TypeScript across all packages
pnpm lint         # Biome lint
pnpm lint:fix     # Biome lint + auto-fix
pnpm format       # Biome format-write
```

Per-package commands are documented in each package's `README.md`. Changesets for versioning go in the package's `.changeset/` directory.
