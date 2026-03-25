import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, ChevronRight, Search, X, MapPin, Calendar } from 'lucide-react';
import { getClaims, deleteClaim, getVehicles } from '@/lib/storage';
import { ClaimReport, Vehicle } from '@/types';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
...
          <div className="space-y-3">
            {filteredClaims.map(c => {
              const rego = getRegoForClaim(c);
              const cn = claimNumbers[c.id];
              const href = c.status === 'draft' ? `/claims/${c.id}/edit` : `/claims/${c.id}`;
              const isDraft = c.status === 'draft';
              const statusLabel = isDraft ? t('common.draft') : c.status === 'saved' ? 'Saved' : t('common.submitted');
              return (
                <div key={c.id} className="card-surface overflow-hidden hover:shadow-md transition-all group">
                  <Link to={href} className="block p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isDraft ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                            {statusLabel}
                          </span>
                          {cn && <span className="text-[11px] font-medium text-muted-foreground">#{cn}</span>}
                        </div>
                        <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">
                          {c.incidentLocation || t('dashboard.untitledReport')}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          {rego && (
                            <span className="text-[12px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md tracking-wide">
                              {rego}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {c.incidentDate || t('claims.noDate')}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/30 mt-1 group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                  <div className="flex items-center justify-end px-4 pb-3 -mt-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Delete
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete report?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone. This will permanently delete this accident report.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
