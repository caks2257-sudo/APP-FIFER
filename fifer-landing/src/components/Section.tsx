import { ReactNode } from 'react';

interface SectionProps {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export default function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="py-12 scroll-mt-8">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-[#F9FAFB] mb-2">{title}</h2>
        {description && <p className="text-sm text-[#9CA3AF]">{description}</p>}
      </div>
      {children}
    </section>
  );
}
