"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

type Post = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  tag: string | null;
  coverImagePath: string | null;
  externalUrl: string | null;
  publishedAt: string | null;
};

const PER_PAGE = 4;

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function MiniCard({ post }: { post: Post }) {
  const isExternal = post.kind === "recurso" && Boolean(post.externalUrl);
  const href = isExternal ? (post.externalUrl as string) : `/noticias/${post.slug}`;
  const inner = (
    <>
      <div className="news-mini-cover">{post.coverImagePath ? <img src={post.coverImagePath} alt="" /> : null}</div>
      <div className="news-mini-body">
        <span className="news-tag">{post.tag ?? post.kind}</span>
        <h4>{post.title}</h4>
        <span className="news-mini-date"><Clock size={12} aria-hidden="true" /> {formatDate(post.publishedAt)}</span>
      </div>
    </>
  );
  return isExternal ? (
    <a className="news-mini" href={href} target="_blank" rel="noreferrer noopener">{inner}</a>
  ) : (
    <Link className="news-mini" href={href}>{inner}</Link>
  );
}

// Carrusel de "Lo más reciente": recuadros pequeños seleccionables, de 4 en 4.
// Si no hay publicaciones, muestra recuadros con estado "Próximamente".
export function NewsCarousel({ posts }: { posts: Post[] }) {
  const [page, setPage] = useState(0);

  if (posts.length === 0) {
    return (
      <div className="news-carousel-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="news-mini news-mini--soon" key={index} aria-hidden={index > 0}>
            <div className="news-mini-cover" />
            <div className="news-mini-body">
              <span className="news-tag">Próximamente</span>
              <h4>Contenido en preparación</h4>
              <span className="news-mini-date">Aún no hay publicaciones</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const pages = Math.ceil(posts.length / PER_PAGE);
  const clamped = Math.min(page, pages - 1);
  const visible = posts.slice(clamped * PER_PAGE, clamped * PER_PAGE + PER_PAGE);

  return (
    <div className="news-carousel">
      <div className="news-carousel-grid">
        {visible.map((post) => (
          <MiniCard key={post.id} post={post} />
        ))}
      </div>
      {pages > 1 ? (
        <div className="carousel-controls">
          <button type="button" className="carousel-arrow" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={clamped === 0} aria-label="Anteriores">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="carousel-dots" role="tablist" aria-label="Páginas de noticias">
            {Array.from({ length: pages }).map((_, index) => (
              <button
                key={index}
                type="button"
                className={`carousel-dot${index === clamped ? " active" : ""}`}
                aria-label={`Página ${index + 1}`}
                aria-selected={index === clamped}
                onClick={() => setPage(index)}
              />
            ))}
          </div>
          <button type="button" className="carousel-arrow" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={clamped >= pages - 1} aria-label="Siguientes">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
