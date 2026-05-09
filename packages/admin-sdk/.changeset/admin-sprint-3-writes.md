---
'@spree/admin-sdk': minor
---

Sprint 3: utility CRUD writes for tax categories, stock items, stock transfers, and payment methods.

- `client.taxCategories` gains `get / create / update / delete`. Backed by `/api/v3/admin/tax_categories`. The serializer now exposes `description` alongside `name`, `tax_code`, and `is_default`. Setting `is_default: true` on create or update auto-demotes the previous default.
- `client.stockItems` is new with `list / get / update / delete`. Adjust `count_on_hand` and `backorderable` on existing variant/location pairings. Stock items are auto-created when a variant lands at a stock location, so there's no `create` here — use the variants and stock-locations endpoints for that flow. Filterable via Ransack on `count_on_hand`, `stock_location_id`, and `variant_id`.
- `client.stockTransfers` is new with `list / get / create / delete`. Backed by `/api/v3/admin/stock_transfers`. The create body takes a `variants: [{ variant_id, quantity }]` array; pass `source_location_id` for a transfer between two locations or omit it to record an external vendor receive at the destination. The model fans the payload out across `stock_movements` and adjusts source/destination `count_on_hand` atomically.
- `client.paymentMethods` gains `create / update / delete / types`. The create body requires `type` (the fully-qualified STI subclass, e.g. `'Spree::PaymentMethod::Check'`); unknown types return a 422 with `unknown_payment_method_type`. New payment methods are scoped to the current store automatically. The serializer now exposes `display_on` and `position` on top of the existing `name`, `description`, `type`, `active`, and `auto_capture`. `client.paymentMethods.types()` returns the registered subclasses as `[{ type, label, description }]` so admin UIs can render a provider dropdown without hard-coding class names.

Provider-specific configuration (Stripe API keys, PayPal credentials, etc.) is **not** part of this release — that lands with the universal preferences form in the next sprint.
