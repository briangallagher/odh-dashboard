/* eslint-disable camelcase */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterDataModal from '~/app/components/RegisterDataModal';
import * as dataRegistryApi from '~/app/api/dataRegistry';
import * as connectionsHook from '~/app/hooks/useConnections';
import * as trackingHook from '~/app/hooks/useDataRegistryTrackEvent';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';

jest.mock('~/app/api/dataRegistry');
jest.mock('~/app/hooks/useConnections');
jest.mock('~/app/hooks/useDataRegistryTrackEvent');

const mockCreateVolume = jest.mocked(dataRegistryApi.createVolume);
const mockCreateGenericTable = jest.mocked(dataRegistryApi.createGenericTable);
const mockUseConnections = jest.mocked(connectionsHook.useConnections);
const mockTrackEvent = jest.fn();

const mockConnections = [
  { name: 'my-s3-connection', displayName: 'My S3 Connection', connectionType: 's3' },
  { name: 'my-uri-connection', displayName: 'My URI Connection', connectionType: 'uri' },
];

describe('RegisterDataModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    project: 'test-project',
    collections: ['collection-1', 'collection-2'],
    onCreated: jest.fn(),
    onManageCollections: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnections.mockReturnValue([mockConnections, true, undefined]);
    jest.mocked(trackingHook.useDataRegistryTrackEvent).mockReturnValue(mockTrackEvent);
  });

  it('should render modal with all form fields', () => {
    render(<RegisterDataModal {...defaultProps} />);

    expect(screen.getByText('Register data')).toBeTruthy();
    expect(screen.getByTestId('data-name-input')).toBeTruthy();
    expect(screen.getByTestId('data-description-input')).toBeTruthy();
    expect(screen.getByTestId('asset-type-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-format-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-collection-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-path-input')).toBeTruthy();
  });

  it('should default to Unstructured asset type', () => {
    render(<RegisterDataModal {...defaultProps} />);

    const assetTypeToggle = screen.getByTestId('asset-type-toggle');
    expect(assetTypeToggle.textContent).toBe('Unstructured');
    expect(assetTypeToggle.className).not.toContain('pf-m-disabled');
  });

  it('should track explicit create-form selections and deduplicate labels case-insensitively', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));
    await user.click(screen.getByTestId('data-format-toggle'));
    await user.click(screen.getByText('Apache Parquet'));
    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));
    await user.click(screen.getByTestId('data-connection-toggle'));
    await user.click(screen.getByText('My S3 Connection'));

    await user.click(screen.getByTestId('data-add-label-button'));
    await user.type(screen.getByTestId('data-labels-input'), 'Finance');
    await user.keyboard('{Enter}');
    await user.click(screen.getByTestId('data-add-label-button'));
    await user.type(screen.getByTestId('data-labels-input'), 'finance');
    await user.keyboard('{Enter}');

    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Asset Type Selected',
      properties: { assetType: 'structured', project: 'test-project' },
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Format Selected',
      properties: { format: 'parquet', project: 'test-project' },
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Collection Selection Changed',
      properties: {
        initialCollection: 'none',
        selectedCollection: 'custom',
        project: 'test-project',
      },
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Connection Selected',
      properties: { project: 'test-project' },
    });
    expect(
      mockTrackEvent.mock.calls.filter(([event]) => event.eventName === 'Data Label Added'),
    ).toHaveLength(1);
  });

  it('should not show schema section for unstructured type', () => {
    render(<RegisterDataModal {...defaultProps} />);

    expect(screen.queryByText('Schema')).toBeNull();
    expect(screen.queryByTestId('add-schema-column')).toBeNull();
  });

  it('should show schema section when switching to structured type', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));

    expect(screen.getByText('Schema')).toBeTruthy();
    expect(screen.getByTestId('add-schema-column')).toBeTruthy();
  });

  it('should switch format options when changing asset type', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    const formatToggle = screen.getByTestId('data-format-toggle');
    await user.click(formatToggle);
    expect(screen.getByText('Documents')).toBeTruthy();
    expect(screen.queryByText('Apache Iceberg')).toBeNull();
    await user.click(screen.getByText('Documents'));

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));

    expect(screen.getByTestId('data-format-toggle').textContent).toBe('Apache Iceberg');
    expect(screen.queryByText('Documents')).toBeNull();
  });

  it('should show validation error when submitting without name', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(screen.getByText('Asset name is required')).toBeTruthy();
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
  });

  it('should show validation error when submitting without collection', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-asset');
    await user.tab();

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(screen.getByText('Collection is required')).toBeTruthy();
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
  });

  it('should submit as volume when asset type is unstructured', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue(mockVolumeInfo({ name: 'test-volume' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-volume');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-volume',
        format: 'other',
      });
    });

    expect(mockCreateGenericTable).not.toHaveBeenCalled();
    expect(defaultProps.onCreated).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Registered',
      properties: {
        success: true,
        assetType: 'unstructured',
        format: 'other',
        hasConnection: false,
        hasCollection: true,
        labelCount: 0,
        project: 'test-project',
      },
    });
  });

  it('should submit as generic table when asset type is structured', async () => {
    const user = userEvent.setup();
    mockCreateGenericTable.mockResolvedValue(mockAssetResponse({ name: 'test-table' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));

    await user.type(screen.getByTestId('data-name-input'), 'test-table');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateGenericTable).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-table',
        format: 'iceberg',
      });
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
    expect(defaultProps.onCreated).toHaveBeenCalled();
  });

  it('should display error message on submission failure', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockRejectedValue(new Error('API error 409: Asset already exists'));

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'existing-asset');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(screen.getByText('Error registering data asset')).toBeTruthy();
      expect(screen.getByText('API error 409: Asset already exists')).toBeTruthy();
    });

    expect(defaultProps.onCreated).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Registered',
      properties: {
        success: false,
        assetType: 'unstructured',
        format: 'other',
        hasConnection: false,
        hasCollection: true,
        labelCount: 0,
        project: 'test-project',
        error: 'unknown_error',
      },
    });
  });

  it('should reset form fields on close', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-name');

    await user.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Registration Canceled',
      properties: { cancelMethod: 'cancel_button', project: 'test-project' },
    });
  });

  it('should show "Create new collection" in collection dropdown', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-collection-toggle'));
    expect(screen.getByText('Create new collection')).toBeTruthy();
  });

  it('should display available connections in dropdown', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-connection-toggle'));
    expect(screen.getByText('My S3 Connection')).toBeTruthy();
    expect(screen.getByText('My URI Connection')).toBeTruthy();
  });

  it('should show empty state when no connections available', async () => {
    mockUseConnections.mockReturnValue([[], true, undefined]);
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-connection-toggle'));
    expect(screen.getByText('No connections available')).toBeTruthy();
  });

  it('should include connection_ref when connection is selected for volume', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue(mockVolumeInfo({ name: 'test-volume' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-volume');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('data-connection-toggle'));
    await user.click(screen.getByText('My S3 Connection'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-volume',
        format: 'other',
        connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
      });
    });
  });

  it('should include connection_ref when connection is selected for table', async () => {
    const user = userEvent.setup();
    mockCreateGenericTable.mockResolvedValue(mockAssetResponse({ name: 'test-table' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));

    await user.type(screen.getByTestId('data-name-input'), 'test-table');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('data-connection-toggle'));
    await user.click(screen.getByText('My S3 Connection'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateGenericTable).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-table',
        format: 'iceberg',
        connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
      });
    });
  });

  it('should not include default path "/" in request', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue(mockVolumeInfo({ name: 'minimal' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'minimal');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'minimal',
        format: 'other',
      });
    });
  });
});
