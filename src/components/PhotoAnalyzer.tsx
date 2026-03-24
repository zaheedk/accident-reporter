import { useState, useRef } from 'react';
import { Camera, Loader2, X, Sparkles, ScanLine, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DamagePhotoAnalyzerProps {
  claimId: string;
  userId: string;
  currentDescription: string;
  onDescriptionGenerated: (desc: string) => void;
  photos: { id: string; file_path: string; file_name: string }[];
}

export function DamagePhotoAnalyzer({ claimId, userId, currentDescription, onDescriptionGenerated, photos }: DamagePhotoAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);

  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage.from('claim-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const analyzePhotos = async () => {
    if (photos.length === 0) {
      toast.error('Upload damage photos first');
      return;
    }
    setAnalyzing(true);
    try {
      const descriptions: string[] = [];
      for (const photo of photos.slice(0, 4)) {
        const url = getPhotoUrl(photo.file_path);
        const { data, error } = await supabase.functions.invoke('analyze-photo', {
          body: { imageUrl: url, type: 'damage' },
        });
        if (error) throw error;
        if (data?.result) descriptions.push(data.result);
      }
      const combined = descriptions.join('\n\n');
      onDescriptionGenerated(combined);
      toast.success('Damage description generated from photos');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to analyze photos');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <button type="button" onClick={analyzePhotos} disabled={analyzing || photos.length === 0}
      className="btn-secondary w-full h-9 gap-2 text-xs">
      {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {analyzing ? 'Analyzing photos...' : 'Generate description from photos'}
    </button>
  );
}

interface ThirdPartyPhotosProps {
  tpIndex: number;
  claimId: string;
  userId: string;
  onRegoDetected: (rego: string) => void;
  onLicenseDetected: (data: { fullName?: string; address?: string; licenseNumber?: string }) => void;
  onDamageDescriptionGenerated: (desc: string) => void;
}

type TPPhoto = { id: string; type: 'damage' | 'rego' | 'license'; url: string; path: string };

export function ThirdPartyPhotos({ tpIndex, claimId, userId, onRegoDetected, onLicenseDetected, onDamageDescriptionGenerated }: ThirdPartyPhotosProps) {
  const [photos, setPhotos] = useState<TPPhoto[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const damageRef = useRef<HTMLInputElement>(null);
  const regoRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);

  // Load existing photos from database on mount
  useState(() => {
    if (claimId && !loaded) {
      supabase
        .from('tp_photos')
        .select('*')
        .eq('claim_id', claimId)
        .eq('tp_index', tpIndex)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mapped = data.map((p: any) => {
              const { data: urlData } = supabase.storage.from('tp-photos').getPublicUrl(p.file_path);
              return { id: p.id, type: p.type as TPPhoto['type'], url: urlData.publicUrl, path: p.file_path };
            });
            setPhotos(mapped);
          }
          setLoaded(true);
        });
    }
  });

  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage.from('tp-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const uploadAndAnalyze = async (file: File, type: 'damage' | 'rego' | 'license') => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setUploading(type);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${claimId}/tp${tpIndex}/${type}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('tp-photos').upload(path, file);
      if (uploadError) throw uploadError;

      const url = getPhotoUrl(path);

      // Persist to database
      const { data: insertedRow, error: dbError } = await supabase.from('tp_photos').insert({
        claim_id: claimId,
        user_id: userId,
        tp_index: tpIndex,
        type,
        file_path: path,
        file_name: file.name,
      }).select().single();
      if (dbError) throw dbError;

      const photoEntry: TPPhoto = { id: insertedRow.id, type, url, path };
      setPhotos(prev => [...prev, photoEntry]);
      setUploading(null);

      // Auto-analyze
      setAnalyzing(type);
      const { data, error } = await supabase.functions.invoke('analyze-photo', {
        body: { imageUrl: url, type },
      });
      if (error) throw error;

      if (type === 'rego' && data?.result) {
        try {
          const parsed = JSON.parse(data.result.replace(/```json\n?|```/g, '').trim());
          if (parsed.rego) {
            onRegoDetected(parsed.rego);
            toast.success(`Rego detected: ${parsed.rego}`);
          } else {
            toast.info('Could not detect rego number from photo');
          }
        } catch {
          toast.info('Could not parse rego detection result');
        }
      } else if (type === 'license' && data?.result) {
        try {
          const parsed = JSON.parse(data.result.replace(/```json\n?|```/g, '').trim());
          onLicenseDetected(parsed);
          if (parsed.fullName) toast.success(`License detected: ${parsed.fullName}`);
          else toast.info('Could not extract license details');
        } catch {
          toast.info('Could not parse license detection result');
        }
      } else if (type === 'damage' && data?.result) {
        onDamageDescriptionGenerated(data.result);
        toast.success('Damage description generated');
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to process ${type} photo`);
    } finally {
      setUploading(null);
      setAnalyzing(null);
    }
  };

  const handleFileChange = (type: 'damage' | 'rego' | 'license') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAndAnalyze(file, type);
    e.target.value = '';
  };

  const removePhoto = async (photo: TPPhoto) => {
    await supabase.storage.from('tp-photos').remove([photo.path]);
    await supabase.from('tp_photos').delete().eq('id', photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  };

  const PhotoButton = ({ type, label, icon: Icon, inputRef }: { type: string; label: string; icon: any; inputRef: React.RefObject<HTMLInputElement> }) => {
    const isUploading = uploading === type;
    const isAnalyzing = analyzing === type;
    const typePhotos = photos.filter(p => p.type === type);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading || isAnalyzing}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/30 bg-background transition-all text-left">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> :
             isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> :
             <Icon className="w-4 h-4 text-muted-foreground" />}
            <span className="text-xs font-medium text-muted-foreground">
              {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing...' : label}
            </span>
          </button>
        </div>
        {typePhotos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {typePhotos.map(p => (
              <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                <img src={p.url} alt={type} className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(p)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-foreground/80 text-card flex items-center justify-center">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <span className="text-xs font-semibold text-muted-foreground">Photos</span>
      <PhotoButton type="damage" label="Take damage photo" icon={Camera} inputRef={damageRef} />
      
      <PhotoButton type="license" label="Capture driver's license" icon={CreditCard} inputRef={licenseRef} />
      <input ref={damageRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange('damage')} />
      <input ref={regoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange('rego')} />
      <input ref={licenseRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange('license')} />
    </div>
  );
}