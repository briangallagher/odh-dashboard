import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { DatabaseIcon, FolderIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useCatalogApi, TableMetadata, VolumeMetadata } from '../../hooks/useCatalogApi';
import AssetTypeBadge from '../../components/AssetTypeBadge';

const CollectionDetailPage: React.FC = () => {
  const { namespace, collection } = useParams<{ namespace: string; collection: string }>();
  const navigate = useNavigate();
  const { fetchTables, fetchVolumes } = useCatalogApi();

  const [tables, setTables] = React.useState<TableMetadata[]>([]);
  const [volumes, setVolumes] = React.useState<VolumeMetadata[]>([]);
  const [loadingTables, setLoadingTables] = React.useState(true);
  const [loadingVolumes, setLoadingVolumes] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!namespace || !collection) return;

    fetchTables(namespace, collection)
      .then(setTables)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingTables(false));

    fetchVolumes(namespace, collection)
      .then(setVolumes)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingVolumes(false));
  }, [namespace, collection]);

  if (!namespace || !collection) {
    return null;
  }

  return (
    <>
      <PageSection variant="light">
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to="/collections">Data Registry</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{collection}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" className="pf-v6-u-mt-md">
          {collection}
        </Title>
        <p className="pf-v6-u-color-200 pf-v6-u-mt-sm">
          Namespace: {namespace}
        </p>
      </PageSection>

      {/* Tables Section */}
      <PageSection>
        <div className="pf-v6-u-display-flex pf-v6-u-justify-content-space-between pf-v6-u-align-items-center pf-v6-u-mb-md">
          <Title headingLevel="h2">Tables</Title>
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            onClick={() => navigate(`/collections/${namespace}/${collection}/tables/create`)}
          >
            Create Table
          </Button>
        </div>

        {loadingTables && (
          <EmptyState>
            <EmptyStateHeader icon={<EmptyStateIcon icon={Spinner} />} titleText="Loading tables" />
          </EmptyState>
        )}

        {!loadingTables && tables.length === 0 && (
          <EmptyState variant="sm">
            <EmptyStateHeader
              icon={<EmptyStateIcon icon={DatabaseIcon} />}
              titleText="No tables"
              headingLevel="h3"
            />
            <EmptyStateBody>
              This collection has no tables yet. Create one to register a data asset.
            </EmptyStateBody>
          </EmptyState>
        )}

        {!loadingTables && tables.length > 0 && (
          <Table aria-label="Tables list" variant="compact">
            <Thead>
              <Tr>
                <Th>Type</Th>
                <Th>Name</Th>
                <Th>Format</Th>
                <Th>Location</Th>
                <Th>Updated</Th>
              </Tr>
            </Thead>
            <Tbody>
              {tables.map((table) => (
                <Tr
                  key={table.name}
                  isClickable
                  onRowClick={() =>
                    navigate(`/collections/${namespace}/${collection}/tables/${table.name}`)
                  }
                >
                  <Td><AssetTypeBadge type="TABLE" /></Td>
                  <Td>{table.name}</Td>
                  <Td>{table.format}</Td>
                  <Td>{table.location}</Td>
                  <Td>{new Date(table.updatedAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>

      {/* Volumes Section */}
      <PageSection>
        <div className="pf-v6-u-display-flex pf-v6-u-justify-content-space-between pf-v6-u-align-items-center pf-v6-u-mb-md">
          <Title headingLevel="h2">Volumes</Title>
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            onClick={() => navigate(`/collections/${namespace}/${collection}/volumes/create`)}
          >
            Create Volume
          </Button>
        </div>

        {loadingVolumes && (
          <EmptyState>
            <EmptyStateHeader icon={<EmptyStateIcon icon={Spinner} />} titleText="Loading volumes" />
          </EmptyState>
        )}

        {!loadingVolumes && volumes.length === 0 && (
          <EmptyState variant="sm">
            <EmptyStateHeader
              icon={<EmptyStateIcon icon={FolderIcon} />}
              titleText="No volumes"
              headingLevel="h3"
            />
            <EmptyStateBody>
              This collection has no volumes yet. Create one to register a storage volume.
            </EmptyStateBody>
          </EmptyState>
        )}

        {!loadingVolumes && volumes.length > 0 && (
          <Table aria-label="Volumes list" variant="compact">
            <Thead>
              <Tr>
                <Th>Type</Th>
                <Th>Name</Th>
                <Th>Volume Type</Th>
                <Th>Location</Th>
                <Th>Updated</Th>
              </Tr>
            </Thead>
            <Tbody>
              {volumes.map((volume) => (
                <Tr
                  key={volume.name}
                  isClickable
                  onRowClick={() =>
                    navigate(`/collections/${namespace}/${collection}/volumes/${volume.name}`)
                  }
                >
                  <Td><AssetTypeBadge type="VOLUME" /></Td>
                  <Td>{volume.name}</Td>
                  <Td>{volume.volumeType}</Td>
                  <Td>{volume.storageLocation}</Td>
                  <Td>{new Date(volume.updatedAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        {error && (
          <EmptyState variant="lg">
            <EmptyStateHeader titleText="Error" headingLevel="h2" />
            <EmptyStateBody>{error}</EmptyStateBody>
          </EmptyState>
        )}
      </PageSection>
    </>
  );
};

export default CollectionDetailPage;
