import { BFF_API_BASE } from '../utilities/const';

export interface ColumnSchema {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface TableMetadata {
  name: string;
  namespace: string;
  collection: string;
  format: string;
  location: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  schema: ColumnSchema[];
  properties: Record<string, string>;
  connectionRef?: string;
}

export interface VolumeMetadata {
  name: string;
  namespace: string;
  collection: string;
  volumeType: string;
  storageLocation: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  properties: Record<string, string>;
}

export interface CollectionSummary {
  name: string;
  namespace: string;
  description?: string;
  tableCount: number;
  volumeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTableRequest {
  name: string;
  format: string;
  location: string;
  description?: string;
  schema: ColumnSchema[];
  properties?: Record<string, string>;
  connectionRef?: string;
}

export interface CreateVolumeRequest {
  name: string;
  volumeType: string;
  storageLocation: string;
  description?: string;
  properties?: Record<string, string>;
}

export interface SearchResult {
  type: 'TABLE' | 'VOLUME';
  name: string;
  namespace: string;
  collection: string;
  description?: string;
  format?: string;
  updatedAt: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BFF_API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`API error ${response.status}: ${error}`);
  }
  return response.json();
}

export const useCatalogApi = () => {
  const fetchCollections = async (namespace?: string): Promise<CollectionSummary[]> => {
    const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    return apiFetch<CollectionSummary[]>(`/collections${params}`);
  };

  const fetchTables = async (namespace: string, collection: string): Promise<TableMetadata[]> => {
    return apiFetch<TableMetadata[]>(
      `/namespaces/${encodeURIComponent(namespace)}/collections/${encodeURIComponent(collection)}/tables`,
    );
  };

  const fetchTableDetail = async (
    namespace: string,
    collection: string,
    name: string,
  ): Promise<TableMetadata> => {
    return apiFetch<TableMetadata>(
      `/namespaces/${encodeURIComponent(namespace)}/collections/${encodeURIComponent(collection)}/tables/${encodeURIComponent(name)}`,
    );
  };

  const fetchVolumes = async (namespace: string, collection: string): Promise<VolumeMetadata[]> => {
    return apiFetch<VolumeMetadata[]>(
      `/namespaces/${encodeURIComponent(namespace)}/collections/${encodeURIComponent(collection)}/volumes`,
    );
  };

  const searchAssets = async (query: string, namespace?: string): Promise<SearchResult[]> => {
    const params = new URLSearchParams({ q: query });
    if (namespace) {
      params.set('namespace', namespace);
    }
    return apiFetch<SearchResult[]>(`/search?${params.toString()}`);
  };

  const createTable = async (
    namespace: string,
    collection: string,
    data: CreateTableRequest,
  ): Promise<TableMetadata> => {
    return apiFetch<TableMetadata>(
      `/namespaces/${encodeURIComponent(namespace)}/collections/${encodeURIComponent(collection)}/tables`,
      { method: 'POST', body: JSON.stringify(data) },
    );
  };

  const createVolume = async (
    namespace: string,
    collection: string,
    data: CreateVolumeRequest,
  ): Promise<VolumeMetadata> => {
    return apiFetch<VolumeMetadata>(
      `/namespaces/${encodeURIComponent(namespace)}/collections/${encodeURIComponent(collection)}/volumes`,
      { method: 'POST', body: JSON.stringify(data) },
    );
  };

  return {
    fetchCollections,
    fetchTables,
    fetchTableDetail,
    fetchVolumes,
    searchAssets,
    createTable,
    createVolume,
  };
};
