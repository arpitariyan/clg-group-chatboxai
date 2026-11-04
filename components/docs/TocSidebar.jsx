'use client';
import { useEffect, useState } from 'react';

export function TocSidebar({ headings }) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (!headings?.length) return;

    const ids = headings.map((h) => h.id);

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-60px 0px -60% 0px',
        threshold: 0,
      }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (!headings?.length) return null;

  return (
    <aside className="docs-toc">
      <div className="docs-toc-heading">On this page</div>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={`docs-toc-link${activeId === h.id ? ' active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveId(h.id);
          }}
        >
          {h.text}
        </a>
      ))}
    </aside>
  );
}

export default TocSidebar;
