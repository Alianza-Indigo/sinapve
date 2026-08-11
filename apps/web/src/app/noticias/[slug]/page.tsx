import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { getPublishedPostBySlug } from "@/server/data/repository";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export default async function NoticiaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug).catch(() => null);
  if (!post) notFound();

  const paragraphs = post.body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader current="/noticias" />
      <main id="main" className="section" style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link className="button" href="/noticias">
          <ArrowLeft size={18} aria-hidden="true" /> Volver a noticias
        </Link>
        <article className="panel" style={{ marginTop: "1rem" }}>
          <div className="news-meta" style={{ marginBottom: 12 }}>
            <span className="news-tag">{post.tag ?? post.kind}</span>
            <span className="news-date">{formatDate(post.publishedAt)}</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>{post.title}</h1>
          <p className="lead">{post.summary}</p>
          {paragraphs.length > 0 ? (
            <div style={{ marginTop: "1rem" }}>
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : null}
          {post.externalUrl ? (
            <p style={{ marginTop: "1rem" }}>
              <a className="button primary" href={post.externalUrl} target="_blank" rel="noreferrer noopener">
                Abrir recurso
              </a>
            </p>
          ) : null}
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
