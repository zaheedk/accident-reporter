import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type PanelShop = {
  id?: string;
  name: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  google_rating: number;
  website: string;
  opening_hours?: string;
  services?: string[];
  photo_url?: string;
  review_count?: number;
  description?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop?: PanelShop | null;
  onSave: (shop: Omit<PanelShop, 'id'>) => Promise<void>;
};

const emptyShop: Omit<PanelShop, 'id'> = {
  name: '', address: '', city: '', region: '', phone: '', email: '', google_rating: 4.5, website: '',
  opening_hours: '', services: [], photo_url: '', review_count: 0, description: '',
};

export default function PanelShopForm({ open, onOpenChange, shop, onSave }: Props) {
  const [form, setForm] = useState<Omit<PanelShop, 'id'>>(shop ? {
    name: shop.name, address: shop.address, city: shop.city, region: shop.region,
    phone: shop.phone, email: shop.email, google_rating: shop.google_rating, website: shop.website,
    opening_hours: shop.opening_hours ?? '', services: shop.services ?? [], photo_url: shop.photo_url ?? '',
    review_count: shop.review_count ?? 0, description: shop.description ?? '',
  } : emptyShop);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof typeof form, value: string | number | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shop ? 'Edit' : 'Add'} Panel Shop</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={e => update('name', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="address">Address *</Label>
            <Input id="address" value={form.address} onChange={e => update('address', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={e => update('city', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="region">Region</Label>
              <Input id="region" value={form.region} onChange={e => update('region', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rating">Google Rating</Label>
              <Input id="rating" type="number" step="0.1" min="0" max="5"
                value={form.google_rating} onChange={e => update('google_rating', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={form.website} onChange={e => update('website', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="review_count">Google review count</Label>
            <Input id="review_count" type="number" min="0" value={form.review_count ?? 0} onChange={e => update('review_count', parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label htmlFor="hours">Opening hours</Label>
            <Input id="hours" placeholder="Mon–Fri 8am–5pm" value={form.opening_hours ?? ''} onChange={e => update('opening_hours', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="services">Services (comma separated)</Label>
            <Input id="services" placeholder="Collision repair, Spray painting, EV certified" value={(form.services ?? []).join(', ')}
              onChange={e => update('services', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
          </div>
          <div>
            <Label htmlFor="photo">Photo URL</Label>
            <Input id="photo" value={form.photo_url ?? ''} onChange={e => update('photo_url', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="desc">Short description</Label>
            <Input id="desc" value={form.description ?? ''} onChange={e => update('description', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Saving...' : shop ? 'Update' : 'Add Shop'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
