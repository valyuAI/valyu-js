# CLAUDE.md - valyu-js

## Confidentiality

Never mention or reference internal models (Anthropic, Gemini, Nova, etc.), internal services, or subprocessors (Brave, etc.) in any code, documentation, comments, or user-facing text. Valyu is model-agnostic — treat all underlying infrastructure as an implementation detail that must not be exposed.

## Feature Rollout Order

When adding new features, update SDKs first, then docs:
1. **valyu-js** (this repo) + **valyu-py** (sibling repo)
2. **valyu-docs** (sibling repo) - API reference, SDK guides, and integration docs

## Repository Layout

```
valyu-js/
├── src/
│   ├── index.ts                  # Main Valyu class & all SDK logic (~2,059 lines)
│   └── types.ts                  # TypeScript type definitions (~788 lines)
├── dist/                         # Compiled output (CJS + ESM + declarations + sourcemaps)
├── examples/                     # 6 example scripts (search, contents, answer, deepresearch, batch, fast-mode)
├── tests/
│   └── integration-test.js       # Integration tests for all APIs
├── docs/                         # Internal dev docs
├── .github/workflows/
│   └── publish.yml               # npm publish on push to main
├── package.json                  # deps: axios
├── tsconfig.json                 # ES2020, strict mode
├── tsup.config.ts                # Bundler config (CJS + ESM + dts)
└── README.md
```

## Key APIs

The `Valyu` class in `src/index.ts` exposes:
- `search(query, options?)` - Web/academic/proprietary search
- `contents(urls, options?)` - Content extraction (sync or async)
- `getContentsJob(jobId)` / `waitForJob(jobId, options?)` - Async contents polling
- `answer(query, options?)` - AI-powered question answering
- `deepresearch` namespace - Research agent (create, status, wait, stream, list, update, cancel, delete, togglePublic, getAssets)
- `batch` namespace - Bulk deep research (create, status, addTasks, listTasks, cancel, list, waitForCompletion)
- `datasources` namespace - List sources and categories

Exported utility: `verifyContentsWebhookSignature()`

## Build & Publish

- **Package manager:** npm
- **Build:** `npm run build` (tsup -> CJS + ESM bundles with declarations)
- **Test:** `npm test` (jest) or `npm run test:integration`
- **Publish:** Automatic on push to `main` via GitHub Actions -> npm
- **Dependency:** axios ^1.4.0

## Git, PRs & CI/CD

- **Default branch:** `main`
- **DANGER: Merging or pushing to `main` immediately publishes to npm.** The GitHub Actions workflow (`.github/workflows/publish.yml`) triggers on every push to `main` and runs `npm publish --access public`.
- **Always work on a feature branch** and open a PR to `main`. Never push directly to `main` unless the user explicitly asks you to.
- **Never merge a PR** unless the user explicitly instructs you to — merging to `main` = live npm release.
- PRs should target `main` and follow the branch naming convention `feature/feature-name`.
- Bump the version in `package.json` as part of the PR when releasing a new version.

## Testing

- Jest + ts-jest for unit tests
- `tests/integration-test.js` covers search, contents, answer APIs
- Requires `VALYU_API_KEY` environment variable

## Conventions

- Single-file SDK implementation in `src/index.ts`
- All types in `src/types.ts` using interfaces, enums, and discriminated unions
- camelCase for methods and properties
- Namespaced sub-APIs (deepresearch, batch, datasources) as object properties on Valyu class
