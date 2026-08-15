import React from 'react';
import { PUBLIC_COMPLIANCE_EMAIL, PUBLIC_SUPPORT_EMAIL } from '../../constants/publicContact';

interface LegalPageProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const LegalPage: React.FC<LegalPageProps> = ({ title, subtitle, lastUpdated, children }) => {
  return (
    <div className="py-20 px-6 max-w-5xl mx-auto">
      <div className="mb-16 border-b border-white/5 pb-8">
        <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 uppercase tracking-tighter">
          {title}
        </h1>
        {subtitle && (
          <p className="text-secondary font-bold text-sm uppercase tracking-[0.3em] mb-4">
            {subtitle}
          </p>
        )}
        <div className="flex items-center gap-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">
            SINARCA DOCUMENT ID: {title.toUpperCase().replace(/\s/g, '_')}_V1
          </p>
          <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">
            Última atualização: {lastUpdated}
          </p>
        </div>
      </div>

      <div className="legal-content text-gray-400 leading-relaxed space-y-12">
        {children}
      </div>

      <div className="mt-32 pt-12 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
          <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Suporte Jurídico</h4>
          <p className="text-sm text-gray-500 mb-6">
            Dúvidas sobre a interpretação destes termos ou conformidade regulatória?
          </p>
          <a href={`mailto:${PUBLIC_SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 text-secondary font-bold hover:gap-3 transition-all">
            {PUBLIC_SUPPORT_EMAIL} <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </div>
        <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10">
          <h4 className="text-primary font-bold uppercase tracking-widest text-xs mb-4">Compliance & Ética</h4>
          <p className="text-sm text-gray-500 mb-6">
            Para denúncias de irregularidades ou violações de conduta ambiental.
          </p>
          <a href={`mailto:${PUBLIC_COMPLIANCE_EMAIL}`} className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all">
            {PUBLIC_COMPLIANCE_EMAIL} <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  );
};
