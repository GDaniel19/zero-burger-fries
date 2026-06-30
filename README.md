# Zero Burger & Fries

Carta digital premium para restaurante, optimizada para mobile, WhatsApp y administracion sin tocar codigo.

## Arquitectura gratuita inicial

- Cloudflare Pages: publica el frontend estatico gratis.
- Cloudflare Pages Functions: API segura para menu, admin, Google Sheets y Cloudinary.
- Google Sheets: base de datos oculta del menu.
- Cloudinary Free: subida de imagenes desde `/admin`.
- GitHub: repositorio conectado a Cloudflare Pages.

Esta primera version usa solo servicios gratuitos: Cloudflare Pages, Google Sheets y Cloudinary Free.
## Ejecutar local

```bash
npm install
cp .env.example .env.local
npm run dev
```

`npm run dev` levanta solo la UI de Next. Para probar tambien las Functions localmente usa Cloudflare Wrangler:

```bash
npm run build
npx wrangler pages dev out
```

La web queda en la URL que muestre Wrangler. El panel esta en `/admin`.

## Variables de entorno

Configuralas en Cloudflare Pages > Settings > Environment variables:

```bash
NEXT_PUBLIC_WHATSAPP_NUMBER=573135000256
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=123456789
SESSION_SECRET=un-secreto-largo-aleatorio
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`NEXT_PUBLIC_WHATSAPP_NUMBER` debe ir con codigo de pais, sin `+`, espacios ni guiones.

## Crear Google Sheets

1. Crea una hoja de calculo en Google Sheets.
2. Renombra la primera pestana como `products`.
3. Crea esta fila de encabezados:

```text
id, category, name, slug, description, ingredients, price, image_url, is_available, is_new, is_featured, is_best_seller, order, created_at, updated_at
```

4. Puedes importar `docs/google-sheets-template.csv` para arrancar rapido.
5. Copia el ID de la hoja desde la URL y ponlo en `GOOGLE_SHEET_ID`.

La API de admin lee y escribe en la pestana indicada por GOOGLE_SHEET_NAME. El endpoint publico /api/menu puede leer el CSV publicado si GOOGLE_SHEET_PUBLIC_CSV_URL esta configurado. El administrador no necesita entrar a Google Sheets.

## Alternativa recomendada: Google Apps Script

Si Google bloquea la creación de claves JSON de Service Account, usa Apps Script. Es el camino recomendado para este proyecto.

1. Abre tu Google Sheet `ZERO BURGER`.
2. Ve a `Extensiones > Apps Script`.
3. Borra el contenido inicial y pega el archivo `docs/google-apps-script.gs`.
4. En Apps Script ve a `Configuración del proyecto > Propiedades de secuencia de comandos`.
5. Agrega esta propiedad:

```text
ZERO_ADMIN_SECRET=zero-burger-123456789
```

6. Clic en `Implementar > Nueva implementación`.
7. Tipo: `Aplicación web`.
8. Ejecutar como: `Yo`.
9. Quién tiene acceso: `Cualquier persona`.
10. Autoriza los permisos.
11. Copia la URL `/exec` de la app web.
12. En Cloudflare Pages agrega:

```env
GOOGLE_APPS_SCRIPT_URL=URL_EXEC_DE_APPS_SCRIPT
GOOGLE_APPS_SCRIPT_SECRET=CAMBIA_ESTE_SECRETO
```

Con esto el admin `/admin` puede crear, editar y desactivar productos sin usar claves de Service Account.
## Cuenta de servicio de Google

1. En Google Cloud Console crea un proyecto.
2. Activa Google Sheets API.
3. Crea una Service Account.
4. Genera una clave JSON.
5. Copia `client_email` en `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
6. Copia `private_key` completa en `GOOGLE_PRIVATE_KEY`, conservando los `\n`.
7. Comparte la hoja de Google Sheets con el correo de la service account como editor.

Las credenciales viven solo en Cloudflare Pages Functions, nunca en el frontend.

## Configurar Cloudinary

1. Crea una cuenta gratis en Cloudinary.
2. En Dashboard copia:
   - Cloud name
   - API key
   - API secret
3. Configura esos valores en Cloudflare Pages.

El panel `/admin` sube imagenes a la carpeta `zero-burger-menu` y guarda en Google Sheets una URL optimizada con `f_auto,q_auto,w_1000`.

## Desplegar en Cloudflare Pages

1. Sube este proyecto a GitHub.
2. En Cloudflare Pages, crea un proyecto conectado al repo.
3. Framework preset: `Next.js` o `None`.
4. Build command:

```bash
npm run build
```

5. Build output directory:

```text
out
```

6. Agrega todas las variables de entorno.
7. Deploy.

Cloudflare detecta la carpeta `functions/` y publica los endpoints `/api/*` junto al sitio estatico.

## Endpoints

- `GET /api/menu`: devuelve productos disponibles. Usa headers de cache para reducir lecturas a Google Sheets.
- `GET /api/admin/products`: devuelve todos los productos. Requiere sesion.
- `POST /api/admin/products`: crea producto en Sheets. Requiere sesion.
- `PUT /api/admin/products/:id`: actualiza producto en Sheets. Requiere sesion.
- `DELETE /api/admin/products/:id`: desactiva producto. Requiere sesion.
- `POST /api/admin/upload`: sube imagen a Cloudinary. Requiere sesion.

## Imagenes en admin

El panel permite tres formas:

1. Subir imagen a Cloudinary.
2. Seleccionar imagen local de `/public/images/menu`.
3. Pegar URL publica de Google Drive.

Google Drive se convierte automaticamente de:

```text
https://drive.google.com/file/d/FILE_ID/view?usp=sharing
```

a:

```text
https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
```

La imagen debe estar compartida como `Cualquier persona con el enlace puede ver`.

## Optimizacion

- `/api/menu` usa cache headers: `max-age`, `s-maxage` y `stale-while-revalidate`.
- La UI consulta el menu una sola vez al cargar.
- El navegador guarda una copia breve en `localStorage` para resiliencia.
- Imagenes con lazy loading.
- Cloudinary entrega imagenes con `f_auto,q_auto,w_1000`.
- Si Sheets falla, la pagina publica muestra datos de respaldo para no quedar vacia.

## Uso del panel admin

1. Entra a `/admin`.
2. Inicia sesion con usuario `admin` y clave `123456789` en local. En produccion usa los valores de `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
3. Crea o edita productos.
4. Cambia categoria, precio, ingredientes, disponibilidad, etiquetas y orden.
5. Sube imagen con Cloudinary o usa Drive/local.
6. Guarda. El producto se escribe en Google Sheets.