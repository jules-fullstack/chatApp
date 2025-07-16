import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const { threshold = 0.5, root = null, rootMargin = '0%', freezeOnceVisible = false } = options;

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry);
    setIsIntersecting(entry.isIntersecting);
  };

  useEffect(() => {
    const element = elementRef.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !element) {
      return;
    }

    const observer = new IntersectionObserver(updateEntry, {
      threshold,
      root,
      rootMargin,
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, JSON.stringify(threshold), root, rootMargin, frozen]);

  return { ref: elementRef, isIntersecting, entry };
}