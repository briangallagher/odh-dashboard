import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  ClipboardCopy,
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
import { useCatalogApi, TableMetadata } from '../../hooks/useCatalogApi';

const TableDetailPage: React.FC = () => {
  const { namespace, collection, name } = useParams<{
    namespace: string;
    collection: string;
    name: string;
  }>();
  const { fetchTableDetail } = useCatalogApi();

  const [table, setTable] = React.useState<TableMetadata | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<string | number>('metadata');

  React.useEffect(() => {
    if (!namespace || !collection || !name) return;

    fetchTableDetail(namespace, collection, name)
      .then((data) => {
        setTable(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [namespace, collection, name]);

  if (!namespace || !collection || !name) {
    return null;
  }

  if (loading) {
    return (
      <PageSection>
        <EmptyState>
          <EmptyStateHeader icon={<EmptyStateIcon icon={Spinner} />} titleText="Loading table details" />
        </EmptyState>
      </PageSection>
    );
  }

  if (error || !table) {
    return (
      <PageSection>
        <EmptyState variant="lg">
          <EmptyStateHeader titleText="Error loading table" headingLevel="h2" />
          <EmptyStateBody>{error || 'Table not found'}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const accessSnippet = `from data_hub import get_table\n\ntable = get_table(\n    namespace="${namespace}",\n    collection="${collection}",\n    name="${name}"\n)\ndf = table.to_pandas()`;

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
                  <DescriptionListDescription>{table.name}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Format</DescriptionListTerm>
                  <DescriptionListDescription>{table.format}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Location</DescriptionListTerm>
                  <DescriptionListDescription>{table.location}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {new Date(table.createdAt).toLocaleString()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Last Updated</DescriptionListTerm>
                  <DescriptionListDescription>
                    {new Date(table.updatedAt).toLocaleString()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {table.owner && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Owner</DescriptionListTerm>
                    <DescriptionListDescription>{table.owner}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {table.description && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription>{table.description}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </PageSection>
          </Tab>

          <Tab eventKey="schema" title={<TabTitleText>Schema</TabTitleText>}>
            <PageSection>
              {table.schema.length === 0 ? (
                <EmptyState variant="sm">
                  <EmptyStateHeader titleText="No schema defined" headingLevel="h3" />
                  <EmptyStateBody>This table does not have a schema defined.</EmptyStateBody>
                </EmptyState>
              ) : (
                <Table aria-label="Schema columns" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Column Name</Th>
                      <Th>Type</Th>
                      <Th>Required</Th>
                      <Th>Description</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {table.schema.map((col) => (
                      <Tr key={col.name}>
                        <Td>{col.name}</Td>
                        <Td>{col.type}</Td>
                        <Td>{col.required ? 'Yes' : 'No'}</Td>
                        <Td>{col.description || '—'}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </PageSection>
          </Tab>

          <Tab eventKey="properties" title={<TabTitleText>Properties</TabTitleText>}>
            <PageSection>
              {Object.keys(table.properties).length === 0 ? (
                <EmptyState variant="sm">
                  <EmptyStateHeader titleText="No properties" headingLevel="h3" />
                  <EmptyStateBody>This table has no custom properties.</EmptyStateBody>
                </EmptyState>
              ) : (
                <Table aria-label="Table properties" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Key</Th>
                      <Th>Value</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Object.entries(table.properties).map(([key, value]) => (
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

          <Tab eventKey="connection" title={<TabTitleText>Connection</TabTitleText>}>
            <PageSection>
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Connection Reference</DescriptionListTerm>
                  <DescriptionListDescription>
                    {table.connectionRef || 'Not configured'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>

              <Title headingLevel="h3" className="pf-v6-u-mt-lg pf-v6-u-mb-md">
                Access Snippet
              </Title>
              <ClipboardCopy isCode isBlock variant="expansion">
                {accessSnippet}
              </ClipboardCopy>
            </PageSection>
          </Tab>
        </Tabs>
      </PageSection>
    </>
  );
};

export default TableDetailPage;
