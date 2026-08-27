# Mugen Play - Agent Guidelines (Ponytail Optimization)

This codebase follows **Ponytail** principles (lazy senior developer / YAGNI architecture).

## The Ponytail Ladder

Before writing any new code or abstraction, stop at the first rung that holds:

1. **Does this need to exist at all?** Speculative need = skip it. (YAGNI)
2. **Already in this codebase?** Look around and reuse existing helpers, utilities, and components before writing new ones.
3. **Standard Library / Platform?** Reach for native standard features (native HTML5, CSS animations, native `fetch`, `AbortController`) instead of pulling in new libraries.
4. **Existing Dependencies?** Use installed packages (`lucide-react`, `hls.js`, `react`). Never add a new dependency for what a few lines of native code can do.
5. **One Line?** If it can be a clean one-liner, keep it one line.
6. **Minimum Working Code:** Write the absolute cleanest, shortest working implementation.

## Core Rules

- **Root Cause, Not Symptom:** Fix bugs at their single source where all callers route through, rather than patching every caller individually.
- **Lazy, Not Negligent:** Never compromise error handling, stream reliability, fallback screens, or performance.
- **Shortest Working Diff:** Deletion over addition. Boring and reliable over complex.

## Large Catalog & Long Franchise Pagination (Chunk-Aware Enrichment)

- **Target-Aware Slices**: For large datasets or long-running franchises (>100 items, e.g. One Piece, Detective Conan), always resolve and enrich metadata (titles, stills, descriptions) on-demand in targeted chunks (50–100 items) corresponding to the user's active page tab or current playing episode.
- **No Global Caps**: Never place hardcoded single-page ceilings (e.g. `Math.min(count, 100)`) on franchise queries; provide on-demand slice pagination instead.

