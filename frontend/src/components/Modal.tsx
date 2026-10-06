import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, subtitle, close, children }: { title: string; subtitle?: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = old; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={e => { e.preventDefault(); onClose.current(); }} onClick={e => { if (e.target === e.currentTarget) onClose.current(); }}>
    <div className="modal-inner"><header className="modal-header"><div><p className="eyebrow">YOUR NUTRITION, YOUR WAY</p><h2 id="modal-title">{title}</h2>{subtitle && <p className="muted">{subtitle}</p>}</div><button type="button" className="icon-button" aria-label="Close dialog" onClick={close}><X size={20}/></button></header>{children}</div>
  </dialog>;
}
