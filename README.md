# BSC Integral · Cuadro de Mando Integral

Plataforma de Balanced Scorecard (metodología Kaplan & Norton) para el sector automotriz, construida con **Astro** y **Supabase**.

Cuatro perspectivas, 35 indicadores precargados, semáforos automáticos, mapa estratégico, tableros visuales con 10 tipos de gráfico e importación de archivos planos.

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear la base de datos

En [supabase.com](https://supabase.com) crea un proyecto, abre **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y presiona **Run**.

Eso crea las 7 tablas, los índices, la seguridad por usuario (RLS) y las 4 perspectivas.

### 3. Poner tus claves en el `.env`

Abre el archivo `.env` y pega los dos valores que aparecen en Supabase → **Settings → API**:

```
PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Es lo único que hay que configurar. **Usa la llave `anon public`, nunca la `service_role`.**

### 4. Crear las cuentas de acceso

En Supabase → **Authentication → Users → Add user**, da de alta a cada responsable con su correo y contraseña (activa *Auto Confirm User*).

### 5. Arrancar

```bash
npm run dev
```

Abre <http://localhost:4321>, inicia sesión y listo. **La primera vez que entres, si la base está vacía, la plataforma la siembra sola** con las 4 perspectivas, los 10 objetivos, las relaciones causa-efecto y los 35 indicadores.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `localhost:4321` con recarga automática |
| `npm run build` | Compila el sitio a `dist/` |
| `npm run preview` | Previsualiza lo compilado |

## Publicar

El proyecto compila a un sitio estático, así que se puede subir tal cual a **Netlify**, **Vercel**, **Cloudflare Pages**, **GitHub Pages** o al Storage del propio Supabase.

```bash
npm run build      # genera dist/
```

En el panel del proveedor define las mismas dos variables (`PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`) y publica la carpeta `dist/`. Desde ahí la plataforma funciona igual en computadora y en celular.

---

## Estructura

```
├── .env                     ← tus claves de Supabase (lo único a configurar)
├── astro.config.mjs
├── supabase/schema.sql      ← script de la base de datos
└── src/
    ├── pages/index.astro    ← página principal
    ├── layouts/Layout.astro ← estructura HTML
    ├── components/          ← menú lateral
    ├── styles/global.css    ← diseño completo
    └── lib/
        ├── app.js           ← arranque y registro de vistas
        ├── state.js         ← estado y persistencia local
        ├── model.js         ← periodos, semáforos, cumplimiento
        ├── charts.js        ← motor de 10 gráficos SVG
        ├── cloud.js         ← Supabase: sesión y sincronización
        ├── router.js        ← navegación entre vistas
        ├── seed.js          ← 35 indicadores iniciales
        ├── ui.js            ← avisos, ventanas, adaptación móvil
        └── views/           ← una vista por sección
```

## Cómo funciona la sincronización

La plataforma guarda todo en el navegador y lo replica en Supabase:

- **Al iniciar sesión** descarga lo último de la nube (o la siembra si está vacía).
- **Al capturar un dato** lo sube automáticamente unos segundos después.
- **Si se va el internet** sigue funcionando y reintenta al reconectar.
- **Si borras un indicador** el borrado se replica en la nube.

En la barra superior siempre ves el estado:

| Indicador | Significado |
|---|---|
| ☁ En la nube · 14:32 | Todo guardado. La hora es la última sincronización. |
| ⟳ Sincronizando… | Enviando cambios. |
| ⚠ Sin guardar | Falló el envío. Haz clic para reintentar. |
| ⌁ Iniciar sesión | Hay claves configuradas pero falta entrar. |
| ◍ Local | `.env` vacío: guarda solo en este dispositivo. |

En **Configuración → Conexión con Supabase** tienes los botones manuales de subir y descargar, y el interruptor de autosincronización.

## Las ocho secciones

| Sección | Para qué |
|---|---|
| Cuadro de Mando | Cumplimiento por perspectiva y tarjeta de cada indicador |
| Tableros Visuales | Un gráfico por indicador, en escala de color, con resumen ejecutivo |
| Mapa Estratégico | Objetivos en las cuatro bandas con relaciones causa-efecto |
| Análisis | Tendencias, historial y estadísticas por indicador |
| Captura de Datos | Alimentar valores por periodo, con pendientes por responsable |
| Indicadores | Agregar, editar, desactivar o eliminar KPIs, metas y umbrales |
| Importar / Exportar | Leer CSV, exportar a Excel y respaldar en `.json` |
| Configuración | Empresa, perspectivas, responsables y nube |

## Seguridad

- La llave `anon public` está pensada para viajar al navegador: por eso lleva el prefijo `PUBLIC_`.
- Quien no tenga una cuenta creada por ti **no puede leer ni escribir nada**: así quedó configurada la seguridad a nivel de tablas (RLS) en `schema.sql`.
- El `.env` está en el `.gitignore`. Nunca subas tus claves a un repositorio público.
- La llave `service_role` no se usa en ningún punto del proyecto, y no debe usarse.
