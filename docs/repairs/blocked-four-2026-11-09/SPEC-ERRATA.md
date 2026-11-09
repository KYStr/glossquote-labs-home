# Additive repair errata — 2026-11-09

These resolutions are primary technical decisions within the user's authorized correction task, recorded before implementation. Original consumed specs remain frozen and are linked by their prior commits; do not silently rewrite them.

- Word frequency: minimum occurrence is a post-count row filter, not a denominator reset. Unicode16 simple case folding uses C+S, not C+F. UI/help/CSV must match this definition.
- Speech: remove network/default fallback despite the original permissive spec. Only currently enumerated localService===true voices may speak; missing local voice means unavailable. Do not equate this flag with completed network/device verification.
- SVG: safety supersedes the original blanket attribute-preservation sentence. Define a strict CSS/attribute subset; remove or reject unsupported constructs visibly and never permit external resource indirection, xml:base or animated reference mutation. Preserve the supported ordinary shapes, colors and safe fragment resources.
- Fluid typography: language toggle alone does not satisfy bilingual static SEO; independent English output is required.

Detailed acceptance and tests are in [MILESTONE.md](MILESTONE.md).
