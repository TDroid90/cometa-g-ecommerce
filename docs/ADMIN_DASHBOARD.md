# COMETA G Admin Dashboard

## Previous structure

The administrative UI previously had one standalone route:

```text
/admin/productos
```

It rendered `ProductEditorClient` directly. The client stored the administrator key in browser `localStorage` under `cometag-admin-secret` and sent it to administrative APIs through the existing `x-admin-secret` header. Server routes validate that header with `verifyAdminSecret()` from `src/lib/adminAuth.ts`.

There was no separate administrator user session, middleware or dashboard layout. Product reads and writes happened through `/api/admin/productos`; product image uploads used `/api/admin/upload-product-image`.

## New routes

```text
/admin/dashboard
/admin/dashboard/productos
/admin/dashboard/lab
```

The compatibility route `/admin/productos` remains available and performs a server redirect to `/admin/dashboard/productos`.

## Persistent layout

`src/app/admin/dashboard/layout.tsx` mounts `AdminDashboardShell`, which provides:

- a persistent responsive sidebar;
- Dashboard, Productos and Laboratorio navigation;
- the active module name in the top header;
- a single administrative access prompt;
- a close-session action that removes the locally stored key.

The shell validates the stored key against `/api/admin/session`. That API uses the existing `x-admin-secret` and `verifyAdminSecret()` mechanism. It does not introduce a second login system or expose the configured secret to the browser.

The structure is ready for future navigation entries without changing the module pages.

## Productos module

`/admin/dashboard/productos` reuses the existing `ProductEditorClient`. Existing operations remain unchanged:

- find a product by ID, SKU, slug or name;
- edit every current Sheet field;
- create products;
- upload and order images;
- save changes to `PRODUCTOS`;
- generate creatives.

Inside the dashboard, the editor hides its duplicate secret input because the dashboard shell already validated and retained the same key.

## LAB module

`/admin/dashboard/lab` contains the first tool, **Normalizador de atributos**. It reads real rows from the same `PRODUCTOS` sheet used by the product editor and supports:

- search by product name or SKU;
- category filtering;
- multiple selection;
- a representative sample of up to 50 products across technical categories;
- before/after comparison;
- `normalized`, `partial`, `legacy` and `conflict` statuses;
- warnings and conflict display;
- the exact cards the storefront would produce from the pipe-delimited string;
- result filters by status and warnings.

## Dry-run safety

The LAB is intentionally read-only:

- `/api/admin/lab/products` only calls `readAdminProductsSheet()`;
- `/api/admin/lab/attributes/normalize` only reads selected rows and returns computed results;
- neither route imports `appendSheetRow`, `updateSheetRow` or any other Sheet mutation helper;
- the UI has no Apply or Save action;
- the response explicitly reports `mode: "dry-run"`.

The maximum request size is 100 products to keep an administrative request bounded.

## Shared normalizer

The canonical implementation now lives in:

```text
src/lib/productAttributes.mjs
```

The Next.js LAB imports that module directly. The catalog importer preserves its existing Python function contract, but `scripts/product_attributes/pipeline.py` delegates normalization to a persistent Node bridge in `scripts/product-attributes-cli.mjs`. This keeps one implementation for aliases, value normalization, schemas, serialization, statuses, warnings and conflict handling.

The bridge remains alive during a catalog import, so a full import does not start a new Node process for every product.

## Security

All new administrative APIs call `verifyAdminSecret(request)`. The dashboard shell only stores the administrator-provided value in the same local storage key used before and transmits it through `x-admin-secret`. Environment variables remain server-only.

The App Router layout itself cannot validate a custom request header during normal browser navigation, so it renders no administrative content until `/api/admin/session` confirms the key. Data APIs independently verify the key on every request.

## Future extensions

Future modules can be added as child routes under `/admin/dashboard` and as entries in `AdminDashboardShell`. Planned examples include Catálogo, Importadores, Imágenes, Armá tu PC, Publicaciones, Logs and Configuración. They are not implemented in this iteration.

## Verification

Run:

```text
python -m unittest tests.test_product_attributes tests.test_admin_dashboard
npm run build
```

The dashboard contract tests verify the compatibility redirect, API protection, real `PRODUCTOS` source, read-only LAB contract and shared importer normalizer.
