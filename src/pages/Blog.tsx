import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { blogArticles } from '@/lib/blog-data';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const ARTICLES_PER_PAGE = 5;

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get('page') || '1'));
  const totalPages = Math.ceil(blogArticles.length / ARTICLES_PER_PAGE);
  const safePage = Math.min(currentPage, totalPages);

  const startIdx = (safePage - 1) * ARTICLES_PER_PAGE;
  const pageArticles = blogArticles.slice(startIdx, startIdx + ARTICLES_PER_PAGE);

  const goToPage = (page: number) => {
    setSearchParams(page === 1 ? {} : { page: String(page) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppLayout>
      <SEO
        title="Car Accident & Insurance Blog for NZ Drivers | SAVO"
        description="Practical New Zealand car insurance, accident, and claims advice — from dashcam tips to dealing with insurers, panel beaters, tow trucks and write-offs."
        path="/blog"
      />
      <div
        className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-stretch min-h-[calc(100dvh-144px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]"
        style={{ marginBottom: 'calc(-64px - env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">SAVO Blog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tips and guides for handling car insurance claims in New Zealand
          </p>
        </div>

        <div className="space-y-4">
          {pageArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="block rounded-[2rem] bg-card overflow-hidden shadow-[0_2px_16px_-6px_hsl(238_44%_16%/0.08)] hover:shadow-[0_12px_32px_-16px_hsl(145_63%_40%/0.25)] hover:-translate-y-1 transition-all group"
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
                <h2 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
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

        {totalPages > 1 && (
          <Pagination className="mt-auto pt-8">
            <PaginationContent>
              {safePage > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => goToPage(safePage - 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === safePage}
                    onClick={() => goToPage(page)}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {safePage < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    onClick={() => goToPage(safePage + 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AppLayout>
  );
}
