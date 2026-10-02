import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegistryTable from '~/app/components/RegistryTable';
import { RegistryAsset } from '~/app/hooks/useAssets';
import * as trackingHook from '~/app/hooks/useDataRegistryTrackEvent';

jest.mock('~/app/hooks/useDataRegistryTrackEvent');

const mockTrackEvent = jest.fn();

const mockAssets: RegistryAsset[] = [
  {
    name: 'claims-data',
    description: 'Claims processing data',
    format: 'parquet',
    assetType: 'table',
    location: 's3://bucket/claims',
    connectionRef: 'minio-connection',
    labels: ['production', 'claims'],
    collection: 'analytics',
    properties: { 'data-domain': 'claims' },
  },
  {
    name: 'raw-documents',
    description: 'PDF documents',
    format: 'documents',
    assetType: 'volume',
    location: 's3://bucket/docs',
    connectionRef: '',
    labels: ['source-docs'],
    collection: 'guidelines',
    properties: { 'retention-class': 'long-term' },
  },
];

const mockLabels = ['production', 'claims', 'source-docs'];

const renderTable = (props?: Partial<React.ComponentProps<typeof RegistryTable>>) =>
  render(
    <MemoryRouter>
      <RegistryTable
        assets={mockAssets}
        loaded
        error={undefined}
        labels={mockLabels}
        project="test-project"
        onManageCollections={jest.fn()}
        onManageLabels={jest.fn()}
        onRegisterData={jest.fn()}
        onRetry={jest.fn()}
        {...props}
      />
    </MemoryRouter>,
  );

describe('RegistryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(trackingHook.useDataRegistryTrackEvent).mockReturnValue(mockTrackEvent);
  });

  it('should render asset names', () => {
    renderTable();
    expect(screen.getByText('claims-data')).toBeTruthy();
    expect(screen.getByText('raw-documents')).toBeTruthy();
  });

  it('should render format badges', () => {
    renderTable();
    expect(screen.getByText('Apache Parquet')).toBeTruthy();
    expect(screen.getByText('Documents')).toBeTruthy();
  });

  it('should render labels', () => {
    renderTable();
    expect(screen.getByText('production')).toBeTruthy();
    expect(screen.getByText('claims')).toBeTruthy();
    expect(screen.getByText('source-docs')).toBeTruthy();
  });

  it('should show loading state', () => {
    renderTable({ loaded: false });
    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('should show error state', () => {
    renderTable({ error: new Error('Failed to load'), loaded: true });
    expect(screen.getByText('Error loading assets')).toBeTruthy();
  });

  it('should show empty state when no assets', () => {
    renderTable({ assets: [] });
    expect(screen.getByText('No assets found')).toBeTruthy();
  });

  it('should render filter dropdowns', () => {
    renderTable();
    expect(screen.getByTestId('filter-category')).toBeTruthy();
    expect(screen.getByTestId('filter-value')).toBeTruthy();
    expect(screen.getByTestId('asset-search')).toBeTruthy();
  });

  it('should filter assets by property key and value', () => {
    renderTable();

    fireEvent.change(screen.getByTestId('asset-search').querySelector('input')!, {
      target: { value: 'retention-class' },
    });

    expect(screen.getByText('raw-documents')).toBeTruthy();
    expect(screen.queryByText('claims-data')).toBeNull();
  });

  it('should render kebab menu', () => {
    renderTable();
    expect(screen.getByTestId('registry-kebab')).toBeTruthy();
  });

  it('should emit a debounced search event with the total filtered result count', () => {
    jest.useFakeTimers();
    renderTable();

    fireEvent.change(screen.getByTestId('asset-search').querySelector('input')!, {
      target: { value: 'claims' },
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(750);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Registry Search Performed',
      properties: {
        hasQuery: true,
        queryLength: 6,
        resultCount: 1,
        project: 'test-project',
      },
    });
    expect(mockTrackEvent.mock.calls[0][0].properties).not.toHaveProperty('query');
    jest.useRealTimers();
  });

  it('should emit an immediate search event when the query is cleared', async () => {
    const user = userEvent.setup();
    renderTable();
    const searchInput = screen.getByTestId('asset-search').querySelector('input')!;

    fireEvent.change(searchInput, { target: { value: 'claims' } });
    mockTrackEvent.mockClear();
    await user.click(screen.getByTestId('asset-search').querySelector('button')!);

    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Registry Search Performed',
      properties: {
        hasQuery: false,
        queryLength: 0,
        resultCount: 2,
        project: 'test-project',
      },
    });
  });

  it('should track asset opens and both registry row action types', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByText('claims-data'));
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Asset Opened',
      properties: { project: 'test-project' },
    });

    await user.click(screen.getByTestId('asset-actions-table-analytics-claims-data'));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Asset Edit Initiated',
      properties: { project: 'test-project' },
    });

    await user.click(screen.getByTestId('asset-actions-volume-guidelines-raw-documents'));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Asset Delete Initiated',
      properties: { project: 'test-project' },
    });
  });
});
