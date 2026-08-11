# ADR 0001: Monolito modular serverless sobre Vercel

## Estado

Aceptada.

## Contexto

El PRD exige que la plataforma completa opere sobre Vercel, con Next.js App Router, TypeScript, Neon PostgreSQL, Blob privado, Queues, Workflows y Cron. Supabase queda excluido.

## Decision

Construir un monorepo con una aplicacion principal `apps/web` y limites de dominio internos claros. Las APIs se implementan como Route Handlers stateless. Los procesos lentos se modelan como trabajos durables o eventos asincronos.

## Consecuencias

- La entrega inicial no inventa datos: sin Neon muestra estados vacios o errores de configuracion explicitos.
- La ruta de produccion queda preparada para Vercel Marketplace.
- Cualquier proveedor alterno debe preservar compatibilidad serverless y documentarse en un nuevo ADR.
