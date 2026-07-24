# Kitbeat

Landing y constructor mobile-first de press kits para DJs, creado con React,
Next.js, TypeScript y Tailwind CSS.

## Funcionalidades

- Formulario obligatorio por pasos con identidad, trayectoria, géneros y setup.
- Carga de hasta cinco fotografías.
- Tres plantillas de diseño con vista previa en vivo.
- Generación y descarga inmediata de PDF.
- Persistencia de perfiles y archivos.
- Panel de registros en `/admin`.
- Integración directa con Supabase y fallback D1/R2 para el hosting.

## Desarrollo

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev
npm run build
```

## Supabase

1. Ejecutar `supabase/schema.sql` en el SQL editor del proyecto.
2. Copiar `.env.example` a `.env.local`.
3. Completar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Sin esas variables, el sitio usa la base de datos y almacenamiento configurados
por Sites.
