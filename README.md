# COMETA G - Computación Gamer

Tienda online gamer con Next.js, Tailwind CSS y Google Sheets como panel inicial.

## Ejecutar en local

```bash
npm install
npm run dev
```

Para producción:

```bash
npm run build
npm run start
```

## Google Sheets

La app lee primero `LAYOUT_SIMPLE`. Si esa hoja no existe o está vacía, usa `LAYOUT` como respaldo.

### LAYOUT_SIMPLE

Columnas:

```txt
id, zona, tipo, titulo, subtitulo, texto, items, imagen, enlace, boton, orden, visible, columnas_desktop, columnas_mobile, carousel, autoplay, filtro, categoria, marca, variante
```

Tipos simples soportados:

```txt
nav, menu, banner, promociones, beneficios, tabs_productos, grilla_productos, categorias, texto, links_footer, contacto_footer
```

Ejemplo de menú del header:

```txt
Inicio|/,Productos|/productos,Placas de video|/productos?categoria=Placas%20de%20video
```

Ejemplo de pestañas con una activa:

```txt
Featured Products|destacado|active;Latest Products|;Sale Products|oferta
```

## PRODUCTOS

Columnas:

```txt
id, sku, nombre, slug, descripcion_corta, descripcion_larga, precio, precio_oferta, stock, stock_status, categoria, subcategoria, marca, tags, imagen_principal, imagenes_extra, atributos, variables, color, garantia, destacado, preventa, fecha_lanzamiento, visible, orden
```

### Agregar más líneas en descripción/atributos

En `atributos` usá pares separados por `|`:

```txt
Memoria:12GB GDDR6X|Uso:Gaming 1440p|Consumo:220W|Fuente recomendada:650W|Conectores:2x HDMI, 3x DisplayPort
```

Cada par se muestra como una línea/recuadro en la página de producto.

### Agregar más fotos

En `imagenes_extra`, pegá URLs separadas por `|`:

```txt
https://imagen-1.jpg|https://imagen-2.jpg|https://imagen-3.jpg
```

La primera imagen sale de `imagen_principal`; las demás aparecen como miniaturas.

### Imágenes desde Google Drive

Podés pegar links públicos de Drive en `imagen_principal` o `imagenes_extra`, por ejemplo:

```txt
https://drive.google.com/file/d/ID_DEL_ARCHIVO/view?usp=sharing
```

La app los convierte a una URL directa. El archivo tiene que estar compartido como "cualquier persona con el enlace puede ver". Para imágenes privadas de Drive hace falta un proxy/API con service account; funciona, pero no es lo ideal para ecommerce por velocidad y límites.

### Relacionados

En la página de producto se muestran hasta 5 productos de la misma `categoria`, ordenados por `orden` descendente. Es decir: los últimos cargados aparecen primero.

## Variables de entorno

```env
GOOGLE_SHEETS_ID=tu_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_JSON={...}
GOOGLE_SHEETS_REVALIDATE_SECONDS=60
BLOB_READ_WRITE_TOKEN=token_de_vercel_blob
ADMIN_UPLOAD_SECRET=una_clave_larga_inventada_por_vos
```

También se puede usar `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`.

## Panel admin en Google Sheets

El panel lateral vive en `apps-script/`.

Instalación:

1. En tu Google Sheet: `Extensiones > Apps Script`.
2. Pegá `apps-script/Code.gs` en `Code.gs`.
3. Creá un archivo HTML llamado `Sidebar` y pegá `apps-script/Sidebar.html`.
4. Guardá y recargá la Sheet.
5. Menú `COMETA G > Configurar API`.
6. API URL:

```txt
https://TU-DOMINIO/api/admin/productos
```

7. Clave admin: el mismo valor de `ADMIN_UPLOAD_SECRET` en Vercel.

Uso:

- Abrí `COMETA G > Crear producto`.
- Completá los campos.
- Subí imágenes.
- Reordenalas con las flechas.
- Tocá `CREAR`.

La primera imagen se guarda en `imagen_principal`; las demás se guardan en `imagenes_extra` separadas por `|`.
