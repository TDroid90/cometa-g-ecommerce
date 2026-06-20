# Backlog: integraciones diarias de catalogos

## Objetivo

Automatizar la descarga diaria de catalogos CSV/API de proveedores y consolidarlos en la Google Sheet de productos, dejando siempre una vista final limpia para publicar en la tienda.

## Proveedores iniciales

- ELIT
- NB / New Bytes

## Arquitectura propuesta

- Crear un endpoint protegido en Next.js: `/api/admin/sync-catalogos`.
- Ejecutarlo una vez por dia con Vercel Cron o un job externo.
- Guardar las credenciales como variables privadas de entorno, nunca en codigo publico.
- Descargar cada catalogo, normalizar columnas y escribir resultados en la Google Sheet de productos.

## Estructura sugerida en Google Sheets

- `PRODUCTOS`: catalogo final que usa la web.
- `CATALOGO_ELIT_RAW`: datos originales descargados de ELIT.
- `CATALOGO_NB_RAW`: datos originales descargados de NB.
- `CATALOGO_CONSOLIDADO`: pre resultado unificado.
- `CATALOGO_RECHAZADOS`: productos descartados por reglas de rubro.
- `CATALOGO_LOG`: fecha, proveedor, cantidad importada, cantidad descartada, errores.

## Regla de consolidacion

Cuando el mismo producto aparezca en mas de un proveedor:

- Detectar equivalencias por SKU, codigo fabricante, MPN, marca + nombre normalizado.
- Conservar el proveedor mas barato.
- Mantener stock real del proveedor elegido.
- Guardar trazabilidad: proveedor_origen, precio_origen, fecha_actualizacion.

## Reglas de descarte

Excluir productos que no correspondan al foco gamer/informatica principal:

- Impresoras.
- Tintas, toners, cartuchos, cilindros, rollos.
- Insumos de oficina: resmas, hojas, lapiceras y similares.
- Televisores que no sean monitores.
- Celulares y telefonia.
- Sistemas operativos, licencias y software digital.
- Robotica.
- Consolas y videojuegos.
- Juegos, pero conservar joysticks y perifericos gamer.
- Contadoras y clasificadoras de billetes.
- Disketeras, floppy y lectores obsoletos.
- Tablets.
- Sintonizadoras y codificadores.
- Trituradoras.
- Candados.
- Repuestos sueltos no relevantes.

## Campos normalizados minimos

- proveedor
- proveedor_codigo
- sku
- nombre
- slug
- descripcion_corta
- descripcion_larga
- precio_costo
- precio_venta
- stock
- stock_status
- categoria
- subcategoria
- marca
- imagen_principal
- imagenes_extra
- atributos
- garantia
- peso
- alto
- ancho
- largo
- visible
- fecha_actualizacion

## Pendientes de implementacion

- Crear normalizadores por proveedor.
- Crear reglas de exclusion por categoria y palabras clave.
- Crear deduplicador por SKU/MPN/nombre normalizado.
- Crear escritura a tabs RAW y CONSOLIDADO.
- Crear actualizacion final de `PRODUCTOS`.
- Crear panel admin para ver ultima sincronizacion y errores.
- Agregar un boton manual: "Sincronizar catalogos ahora".
