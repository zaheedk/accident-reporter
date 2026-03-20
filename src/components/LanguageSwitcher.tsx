import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@/i18n';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <div className="flex gap-1 flex-wrap">
        {LANGUAGES.map(({ code, flag, label }) => (
          <button
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              i18n.language === code || (i18n.language.startsWith(code))
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            {flag} {label}
          </button>
        ))}
      </div>
    </div>
  );
}
