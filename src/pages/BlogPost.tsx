import { useParams, Link, Navigate } from 'react-router-dom';
import { getArticleBySlug } from '@/lib/blog-data';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ReactMarkdown from 'react-markdown';
import SEO from '@/components/SEO';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  // Redirects from old/renamed slugs (previously indexed by Google) to current slugs.
  const SLUG_REDIRECTS: Record<string, string> = {
    'third-party-claims-nz': 'comprehensive-vs-third-party-insurance-nz',
    'understanding-car-insurance-nz': 'understanding-car-insurance-types-new-zealand',
    'what-to-do-after-car-accident-nz': 'what-to-do-after-car-accident-new-zealand',
    'right-of-way-rules-nz': 'right-of-way-rules-nz-intersections',
    'roadside-assistance-nz': 'roadside-assistance-nz-what-to-know',
    'talking-to-your-insurer-nz': 'how-to-talk-to-your-insurer-after-accident-nz',
    'dashcam-insurance-claims-nz': 'dashcam-phone-evidence-insurance-claims-nz',
    'insurance-renewal-tips-nz': 'renewing-car-insurance-nz-tips',
    'choosing-panel-beater-nz': 'towing-rights-nz-choosing-tow-company',
  };
  if (slug && SLUG_REDIRECTS[slug]) {
    return <Navigate to={`/blog/${SLUG_REDIRECTS[slug]}`} replace />;
  }

  const article = slug ? getArticleBySlug(slug) : undefined;
  if (!article) return <Navigate to="/blog" replace />;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    image: `https://savo.co.nz${article.heroImage}`,
    datePublished: article.date,
    dateModified: article.date,
    author: { "@type": "Organization", name: "SAVO" },
    publisher: {
      "@type": "Organization",
      name: "SAVO",
      logo: { "@type": "ImageObject", url: "https://savo.co.nz/app-icon-512.png" },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://savo.co.nz/blog/${article.slug}`,
    },
  };

  return (
    <AppLayout>
      <SEO
        title={`${article.title} | SAVO`}
        description={article.metaDescription}
        path={`/blog/${article.slug}`}
        type="article"
        publishedTime={article.date}
        jsonLd={articleJsonLd}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to blog
        </Link>

        <article>
          <img
            src={article.heroImage}
            alt={article.title}
            className="w-full h-48 object-cover rounded-xl mb-5"
            width={896}
            height={512}
          />
          <h1 className="text-2xl font-bold text-foreground leading-tight">{article.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(article.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.readTime}
            </span>
          </div>

          <div className="mt-6 prose prose-sm prose-neutral dark:prose-invert max-w-none
            prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground
            prose-strong:text-foreground prose-a:text-primary
            prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
            prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5
            prose-p:my-3 prose-p:leading-relaxed
            prose-em:text-muted-foreground/80">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </article>

        <div className="mt-10 pt-6 border-t border-border">
          <Link to="/blog" className="text-sm text-primary font-medium hover:underline">
            ← More articles
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
