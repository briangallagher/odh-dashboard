import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  PageSection,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { BFF_API_BASE } from '../../utilities/const';

interface VolumeDetail {
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

const VolumeDetailPage: React.FC = () => {
  const { namespace, collection, name } = useParams<{
    namespace: string;
    collection: string;
    name: string;
  }>();

  const [volume, setVolume] = React.useState<VolumeDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<string | number>('metadata');

  React.useEffect(() => {
    if (!namespace || !collection || !name) return;

    const fetchVolume = async () => {
      try {
        const response = await fetch(
          `${BFF_API_BASE}/namespaces/${encodeURIComponent(namespace)}/collections/${encodeURIComponent(collection)}/volumes/${encodeURIComponent(name)}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to load volume: ${response.statusText}`);
        }
        const data: VolumeDetail = await response.json();
        setVolume(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchVolume();
  }, [namespace, collection, name]);

  if (!namespace || !collection || !name) {
    return null;
  }

  if (loading) {
    return (
      <PageSection>
        <EmptyState>
          <EmptyStateHeader icon={<EmptyStateIcon icon={Spinner} />} titleText="Loading volume details" />
        </EmptyState>
      </PageSection>
    );
  }

  if (error || !volume) {
    return (
      <PageSection>
        <EmptyState variant="lg">
          <EmptyStateHeader titleText="Error loading volume" headingLevel="h2" />
          <EmptyStateBody>{error || 'Volume not found'}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection variant="light">
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to="/collections">Data Registry</Link>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Link to={`/collections/${namespace}/${collection}`}>{collection}</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{name}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" className="pf-v6-u-mt-md">
          {name}
        </Title>
        <p className="pf-v6-u-color-200 pf-v6-u-mt-sm">
          {namespace} / {collection}
        </p>
      </PageSection>

      <PageSection variant="light" padding={{ default: 'noPadding' }}>
        <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(key)}>
          <Tab eventKey="metadata" title={<TabTitleText>Metadata</TabTitleText>}>
            <PageSection>
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Name</DescriptionListTerm>
                  <DescriptionListDescription>{volume.name}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Volume Type</DescriptionListTerm>
                  <DescriptionListDescription>{volume.volumeType}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Storage Location</DescriptionListTerm>
                  <DescriptionListDescription>{volume.storageLocation}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {new Date(volume.createdAt).toLocaleString()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Last Updated</DescriptionListTerm>
                  <DescriptionListDescription>
                    {new Date(volume.updatedAt).toLocaleString()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {volume.description && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription>{volume.description}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </PageSection>
          </Tab>

          <Tab eventKey="properties" title={<TabTitleText>Properties</TabTitleText>}>
            <PageSection>
              {Object.keys(volume.properties).length === 0 ? (
                <EmptyState variant="sm">
                  <EmptyStateHeader titleText="No properties" headingLevel="h3" />
                  <EmptyStateBody>This volume has no custom properties.</EmptyStateBody>
                </EmptyState>
              ) : (
                <Table aria-label="Volume properties" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Key</Th>
                      <Th>Value</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Object.entries(volume.properties).map(([key, value]) => (
                      <Tr key={key}>
                        <Td>{key}</Td>
                        <Td>{value}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </PageSection>
          </Tab>
        </Tabs>
      </PageSection>
    </>
  );
};

export default VolumeDetailPage;
