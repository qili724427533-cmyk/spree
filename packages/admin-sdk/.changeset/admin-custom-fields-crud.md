---
'@spree/admin-sdk': minor
---

Custom Fields CRUD API + token-based `field_type`.

- New `client.{products,variants,orders,customers,categories,optionTypes}.customFields` accessors with `list / get / create / update / delete`.
- New top-level `client.customFieldDefinitions` accessor with full CRUD.
- New generic escape hatch `client.customFields(ownerType, ownerId)` for plugin-defined parents that don't have a first-class accessor.
- `CustomField.field_type` and `CustomFieldDefinition.field_type` are now string-literal unions (`'short_text' | 'long_text' | 'rich_text' | 'number' | 'boolean' | 'json' | (string & {})`) instead of plain `string`. Built-ins narrow + autocomplete; plugin tokens still type-check.
- `CustomField` retains the legacy `type` field (Ruby STI class name) alongside the new `field_type` token. The TypeScript type is annotated with `@deprecated` so editors surface the migration tip on hover; eslint with `no-deprecated` will flag references. Migrate to `field_type`; `type` will be removed in a future minor.
- New `CustomFieldDefinition` type exported from the package.
- Includes the `Spree::CustomField` / `Spree::CustomFieldDefinition` constant aliases on the server side; no naming changes to existing models or table layout.
