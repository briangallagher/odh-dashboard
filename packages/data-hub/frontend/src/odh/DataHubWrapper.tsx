import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import DataHubRoutes from '../app/DataHubRoutes';

const DataHubWrapper: React.FC = () => (
  <BrowserRouter basename="/ai-hub/data">
    <DataHubRoutes />
  </BrowserRouter>
);

export default DataHubWrapper;
