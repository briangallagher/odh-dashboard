import React from 'react';
import { BFF_API_BASE } from '../utilities/const';

interface UseAccessibleNamespacesResult {
  namespaces: string[];
  loading: boolean;
  error: string | null;
}

export const useAccessibleNamespaces = (): UseAccessibleNamespacesResult => {
  const [namespaces, setNamespaces] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchNamespaces = async () => {
      try {
        const response = await fetch(`${BFF_API_BASE}/namespaces`);
        if (!response.ok) {
          throw new Error(`Failed to fetch namespaces: ${response.statusText}`);
        }
        const data: string[] = await response.json();
        if (!cancelled) {
          setNamespaces(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchNamespaces();
    return () => {
      cancelled = true;
    };
  }, []);

  return { namespaces, loading, error };
};
