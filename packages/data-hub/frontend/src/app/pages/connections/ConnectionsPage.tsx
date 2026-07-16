import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
  EmptyStateBody,
  Gallery,
  GalleryItem,
  Card,
  CardTitle,
  CardBody,
  Label,
  PageSection,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { ProjectSelector } from '../../components/ProjectSelector';
import { BFF_API_BASE } from '../../utilities/const';

interface DataConnection {
  name: string;
  namespace: string;
  displayName: string;
  connectionType: string;
  endpoint: string;
  bucket: string;
  region: string;
  linkedTables: number;
}

export const ConnectionsPage: React.FC = () => {
  const [connections, setConnections] = React.useState<DataConnection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchValue, setSearchValue] = React.useState('');
  const [selectedProject, setSelectedProject] = React.useState<string | null>(
    () => new URLSearchParams(window.location.search).get('project'),
  );

  const fetchConnections = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = selectedProject ? `?namespace=${selectedProject}` : '';
      const response = await fetch(`${BFF_API_BASE}/connections${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch connections: ${response.statusText}`);
      }
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  React.useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const filteredConnections = React.useMemo(() => {
    if (!searchValue) return connections;
    const q = searchValue.toLowerCase();
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.endpoint.toLowerCase().includes(q) ||
        c.bucket.toLowerCase().includes(q),
    );
  }, [connections, searchValue]);

  const handleProjectChange = (project: string | null) => {
    setSelectedProject(project);
    const url = new URL(window.location.href);
    if (project) {
      url.searchParams.set('project', project);
    } else {
      url.searchParams.delete('project');
    }
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <>
      <PageSection variant="light">
        <Breadcrumb>
          <BreadcrumbItem>Data Registry</BreadcrumbItem>
          <BreadcrumbItem isActive>Connections</BreadcrumbItem>
        </Breadcrumb>
      </PageSection>

      <PageSection variant="light" padding={{ default: 'noPadding' }}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <ProjectSelector
                selectedProject={selectedProject}
                onProjectChange={handleProjectChange}
              />
            </ToolbarItem>
            <ToolbarItem variant="search-filter">
              <SearchInput
                placeholder="Filter connections..."
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        {loading ? (
          <Spinner size="xl" />
        ) : error ? (
          <EmptyState>
            <EmptyStateBody>{error}</EmptyStateBody>
          </EmptyState>
        ) : filteredConnections.length === 0 ? (
          <EmptyState>
            <EmptyStateBody>
              {searchValue
                ? 'No connections match your filter.'
                : selectedProject
                  ? `No Data Connections found in project "${selectedProject}".`
                  : 'No Data Connections found. Create a Data Connection in your project to link storage credentials to catalog assets.'}
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <Gallery hasGutter minWidths={{ default: '300px' }}>
            {filteredConnections.map((conn) => (
              <GalleryItem key={`${conn.namespace}/${conn.name}`}>
                <Card isCompact>
                  <CardTitle>
                    {conn.displayName || conn.name}
                    <Label isCompact style={{ marginLeft: 8 }} color="blue">
                      {conn.connectionType || 's3'}
                    </Label>
                  </CardTitle>
                  <CardBody>
                    <DescriptionList isCompact isHorizontal>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Project</DescriptionListTerm>
                        <DescriptionListDescription>
                          {conn.namespace}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Endpoint</DescriptionListTerm>
                        <DescriptionListDescription>
                          {conn.endpoint || '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Bucket</DescriptionListTerm>
                        <DescriptionListDescription>
                          {conn.bucket || '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      {conn.region && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>Region</DescriptionListTerm>
                          <DescriptionListDescription>
                            {conn.region}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      )}
                      <DescriptionListGroup>
                        <DescriptionListTerm>Linked tables</DescriptionListTerm>
                        <DescriptionListDescription>
                          {conn.linkedTables}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Card>
              </GalleryItem>
            ))}
          </Gallery>
        )}
      </PageSection>
    </>
  );
};
