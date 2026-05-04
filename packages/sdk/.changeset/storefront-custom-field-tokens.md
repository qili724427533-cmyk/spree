---
'@spree/sdk': minor
---

Custom field `field_type` token.

- `CustomField` now exposes `field_type` as a string-literal union (`'short_text' | 'long_text' | 'rich_text' | 'number' | 'boolean' | 'json' | (string & {})`) — abstract token instead of the Ruby STI class name. Aligns with how Shopify, Saleor, Vendure, and commercetools expose typed custom fields.
- The legacy `type` field (e.g. `'Spree::Metafields::ShortText'`) is unchanged and still emitted alongside the new `field_type` for back-compat. The TypeScript type is annotated with `@deprecated` so editors surface the migration tip on hover; eslint with `no-deprecated` will flag references. Storefronts should switch to `field_type`; `type` will be removed in a future minor.
