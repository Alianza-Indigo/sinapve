# ADR 0002: Exclusion total de Supabase

## Estado

Aceptada.

## Contexto

El PRD prohibe Supabase Database, Auth, Storage, Realtime, Edge Functions, Vector, SDK y variables equivalentes.

## Decision

No instalar paquetes `@supabase/*`, no crear variables `SUPABASE_*` y no acoplar reglas de seguridad a RLS propietaria de Supabase.

## Consecuencias

- PostgreSQL se consume por Neon y Drizzle.
- Archivos sensibles se administran por Vercel Blob privado.
- Identidad institucional queda pendiente de proveedor OIDC/SAML aprobado.
