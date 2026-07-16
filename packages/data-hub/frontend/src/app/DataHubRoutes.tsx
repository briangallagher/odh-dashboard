import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';

const CollectionsPage = lazy(() => import('./pages/collections/CollectionsPage'));
const CollectionDetailPage = lazy(() => import('./pages/collections/CollectionDetailPage'));
const TableDetailPage = lazy(() => import('./pages/tables/TableDetailPage'));
const VolumeDetailPage = lazy(() => import('./pages/volumes/VolumeDetailPage'));
const SearchPage = lazy(() => import('./pages/search/SearchPage'));

const Loading: React.FC = () => (
  <Bullseye>
    <Spinner size="xl" />
  </Bullseye>
);

const DataHubRoutes: React.FC = () => (
  <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/collections/:namespace/:collection" element={<CollectionDetailPage />} />
      <Route path="/collections/:namespace/:collection/tables/:name" element={<TableDetailPage />} />
      <Route path="/collections/:namespace/:collection/volumes/:name" element={<VolumeDetailPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="*" element={<Navigate to="/collections" replace />} />
    </Routes>
  </Suspense>
);

export default DataHubRoutes;
