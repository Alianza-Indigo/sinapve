import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { listPublishedPosts, type PublicPost } from "@/server/data/repository";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export default async function NoticiasPage() {
  const posts = await listPublishedPosts(50).catch(() => [] as PublicPost[]);

  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader current="/noticias" />
      <main id="main" className="landing section-block">
        <h1 className="section-title">Noticias, comunicados y recursos</h1>
        <p className="section-sub">Información oficial de SINAPVE sobre convivencia escolar, prevención y resultados.</p>
        {posts.length > 0 ? (
          <div className="news-grid">
            {posts.map((post) => {
              const href = post.kind === "recurso" && post.externalUrl ? post.externalUrl : `/noticias/${post.slug}`;
              const isExternal = post.kind === "recurso" && Boolean(post.externalUrl);
              const cta = post.kind === "recurso" ? "Descargar" : "Leer más";
              return (
                <article className="news-card" key={post.id}>
                  <div className="news-cover">{post.coverImagePath ? <img src={post.coverImagePath} alt="" /> : null}</div>
                  <div className="news-body">
                    <div className="news-meta">
                      <span className="news-tag">{post.tag ?? post.kind}</span>
                      <span className="news-date">{formatDate(post.publishedAt)}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.summary}</p>
                    {isExternal ? (
                      <a className="news-link" href={href} target="_blank" rel="noreferrer noopener">{cta} <ArrowRight size={15} aria-hidden="true" /></a>
                    ) : (
                      <Link className="news-link" href={href}>{cta} <ArrowRight size={15} aria-hidden="true" /></Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted">Aún no hay publicaciones disponibles.</p>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
