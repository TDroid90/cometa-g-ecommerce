# Entornos locales de COMETA G

## Produccion

La produccion se ejecuta en Vercel. Sus variables sensibles permanecen configuradas solamente en el proyecto `cometa-g-ecommerce` de Vercel. No se deben copiar a `.env.local`.

## Sandbox local

Para iniciar la tienda local usando el catalogo real de Google Sheets y Payway en modo sandbox:

```powershell
.\scripts\start-local-sandbox.ps1
```

El script carga la cuenta de servicio local de Google y toma exclusivamente el bloque `Sand` de `payway/CRED.txt`. No escribe ni modifica variables de produccion.

La URL local es `http://127.0.0.1:3000`.

## Seguridad

- `.env.local`, el archivo de cuenta de servicio y `payway/CRED.txt` no se versionan.
- Payway local usa siempre `PAYWAY_ENVIRONMENT=developer`.
- Produccion usa los secretos configurados en Vercel.
