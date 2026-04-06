import { Link } from 'react-router-dom';
import { blogArticles } from '@/lib/blog-data';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function Blog() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">SAVO Blog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tips and guides for handling car insurance claims in New Zealand
          </p>
        </div>

        <div className="space-y-4">
          {blogArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group"
            >
              <img
                src={article.heroImage}
                alt={article.title}
                className="w-full h-40 object-cover"
                loading="lazy"
                width={896}
                height={512}
              />
              <div className="p-4">
                <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {article.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(article.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {article.readTime}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
