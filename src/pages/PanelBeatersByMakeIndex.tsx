import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Car, ArrowRight } from 'lucide-react';
import { NZ_CAR_MAKES } from '@/lib/car-makes';

export default function PanelBeatersByMakeIndex() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Panel Beaters by Vehicle Make — New Zealand',
    description: 'Find panel beaters and approved collision repair shops by vehicle make across New Zealand.',
  };

  return (
    <AppLayout>
      <SEO
        title="Panel Beaters by Car Make NZ — Approved Collision Repairers"
        description="Find panel beaters experienced with your vehicle make. Browse approved collision repair specialists by Toyota, Ford, Mazda, Hyundai, BMW and more across New Zealand."
        path="/panel-beaters-for"
        jsonLd={jsonLd}
      />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Panel Beaters by Vehicle Make</h1>
          <p className="text-muted-foreground max-w-2xl">
            Some insurers require make-approved repairers, especially for European brands or EVs with aluminium bodies. Browse panel beaters experienced with your vehicle make below.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {NZ_CAR_MAKES.map((make) => (
            <Link key={make.slug} to={`/panel-beaters-for/${make.slug}`}>
              <Card className="p-3 hover:bg-accent transition-colors flex items-center justify-between text-sm">
                <span className="text-foreground flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-primary" />
                  {make.name}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
