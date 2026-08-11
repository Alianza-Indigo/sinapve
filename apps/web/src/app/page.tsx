import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  GraduationCap,
  Landmark,
  LockKeyhole,
  MessageSquare,
  School,
  ShieldCheck,
  Users,
  UsersRound
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { listPublishedPosts, type PublicPost } from "@/server/data/repository";

export const dynamic = "force-dynamic";

const actions = [
  { icon: MessageSquare, title: "Hacer un reporte", text: "Reporta situaciones de violencia escolar de forma segura y confidencial.", href: "/reporte", cta: "Ir al formulario" },
  { icon: ClipboardCheck, title: "Dar seguimiento", text: "Consulta el estatus de tu reporte y las acciones realizadas.", href: "/seguimiento", cta: "Consultar" },
  { icon: ShieldCheck, title: "Conocer protocolos", text: "Accede a los protocolos nacionales de prevención, detección e intervención.", href: "/que-es#protocolos", cta: "Ver protocolos" },
  { icon: GraduationCap, title: "Formación APVE", text: "Capacitación y certificación para Agentes Preventivos de Violencia Escolar.", href: "/que-es#formacion", cta: "Ir a formación" },
  { icon: BarChart3, title: "Transparencia", text: "Consulta indicadores, informes y datos abiertos sobre convivencia escolar.", href: "/transparencia", cta: "Explorar datos" }
];

const audiences = [
  { icon: Users, title: "Estudiantes", text: "Reporta o solicita apoyo de forma segura." },
  { icon: UsersRound, title: "Familias", text: "Acompaña y da seguimiento a los casos." },
  { icon: BookOpen, title: "Docentes y personal", text: "Previene, detecta y actúa con protocolos." },
  { icon: School, title: "Escuelas", text: "Gestiona tu comité, casos e indicadores." },
  { icon: Landmark, title: "Autoridades", text: "Supervisa, coordina y toma decisiones basadas en datos." },
  { icon: Building2, title: "Comunidad", text: "Participa en iniciativas por la convivencia escolar." }
];

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function PostCard({ post }: { post: PublicPost }) {
  const href = post.kind === "recurso" && post.externalUrl ? post.externalUrl : `/noticias/${post.slug}`;
  const isExternal = post.kind === "recurso" && Boolean(post.externalUrl);
  const cta = post.kind === "recurso" ? "Descargar" : "Leer más";
  return (
    <article className="news-card">
      <div className="news-cover">{post.coverImagePath ? <img src={post.coverImagePath} alt="" /> : null}</div>
      <div className="news-body">
        <div className="news-meta">
          <span className="news-tag">{post.tag ?? post.kind}</span>
          <span className="news-date">{formatDate(post.publishedAt)}</span>
        </div>
        <h3>{post.title}</h3>
        <p>{post.summary}</p>
        {isExternal ? (
          <a className="news-link" href={href} target="_blank" rel="noreferrer noopener">
            {cta} <ArrowRight size={15} aria-hidden="true" />
          </a>
        ) : (
          <Link className="news-link" href={href}>
            {cta} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

export default async function HomePage() {
  const posts = await listPublishedPosts(3).catch(() => [] as PublicPost[]);

  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader current="/" />

      <main id="main">
        <section className="landing">
          <div className="landing-hero">
            <div className="hero-copy">
              <h1>
                Por entornos escolares <span className="hl">seguros</span>, inclusivos y en paz.
              </h1>
              <p className="hero-lead">
                SINAPVE es la plataforma nacional que coordina la prevención, detección, atención e intervención ante la violencia
                escolar en todo México, con enfoque de derechos humanos, inclusión y perspectiva de género.
              </p>
              <div className="hero-actions-lg">
                <Link className="btn-lg primary" href="/reporte">
                  <MessageSquare size={18} aria-hidden="true" /> Hacer un reporte
                </Link>
                <Link className="btn-lg" href="/que-es">
                  Conocer más <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
              <p className="hero-privacy">
                <LockKeyhole size={16} aria-hidden="true" /> Tus datos están protegidos. Consulta nuestro{" "}
                <Link href="/legal/aviso-privacidad" style={{ color: "var(--violet)", fontWeight: 700 }}>Aviso de Privacidad</Link>.
              </p>
            </div>
            <div className="hero-media">
              <div className="hero-ph" role="img" aria-label="Estudiantes en un entorno escolar seguro" />
            </div>
          </div>
        </section>

        <section className="landing section-block" aria-labelledby="acciones-title">
          <h2 className="section-title" id="acciones-title">¿Qué puedes hacer en SINAPVE?</h2>
          <div className="action-cards">
            {actions.map((action) => (
              <div className="action-card" key={action.title}>
                <span className="ac-icon"><action.icon size={24} aria-hidden="true" /></span>
                <h3>{action.title}</h3>
                <p>{action.text}</p>
                <Link href={action.href}>{action.cta} <ArrowRight size={15} aria-hidden="true" /></Link>
              </div>
            ))}
          </div>
        </section>

        <section className="landing section-block" aria-labelledby="audiencia-title">
          <h2 className="section-title" id="audiencia-title">¿A quién está dirigido?</h2>
          <div className="audience-grid">
            {audiences.map((audience) => (
              <div className="audience" key={audience.title}>
                <span className="aud-icon"><audience.icon size={30} aria-hidden="true" /></span>
                <h3>{audience.title}</h3>
                <p>{audience.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing section-block" aria-labelledby="reciente-title">
          <div className="section-head-row">
            <h2 id="reciente-title">Lo más reciente</h2>
            <Link className="link-more" href="/noticias">Ver todas las noticias <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          {posts.length > 0 ? (
            <div className="news-grid">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="muted">Aún no hay publicaciones. Las noticias, comunicados y recursos aparecerán aquí una vez publicados.</p>
          )}
        </section>

        <section className="landing">
          <div className="community-band">
            <div>
              <h2>Juntos construimos entornos escolares seguros.</h2>
              <p>La prevención es responsabilidad de todas y todos.</p>
            </div>
            <Link className="btn-community" href="/que-es">
              Únete a la comunidad SINAPVE <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
