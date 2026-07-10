import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpButtonProps {
  title: string;
  content: string;
  steps?: string[];
}

export default function HelpButton({ title, content, steps }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full transition-all hover:scale-110"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}
        title="Help"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Help Box — Fixed center on screen */}
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm rounded-2xl shadow-2xl border p-5"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
                  <HelpCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:opacity-70"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              {content}
            </p>

            {/* Steps */}
            {steps && steps.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Steps:
                </p>
                <ol className="space-y-1.5">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                        style={{ backgroundColor: 'var(--accent)' }}
                      >
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Footer tip */}
            <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
              💡 Click anywhere outside to close
            </div>
          </div>
        </>
      )}
    </div>
  );
}
