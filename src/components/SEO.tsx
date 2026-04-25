import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  /** Path-only canonical (e.g. "/blog/foo"). Will be prefixed with site origin. */
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
}

const SITE_ORIGIN = "https://www.savo.co.nz";

export default function SEO({
  title,
  description,
  path = "/",
  image = `${SITE_ORIGIN}/app-icon.png`,
  type = "website",
  publishedTime,
  jsonLd,
  noIndex = false,
}: SEOProps) {
  const canonical = `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  const fullImage = image.startsWith("http") ? image : `${SITE_ORIGIN}${image}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={fullImage} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
