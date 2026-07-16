import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  PageSection,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SearchIcon } from '@patternfly/react-icons';
import { useCatalogApi, SearchResult } from '../../hooks/useCatalogApi';
import AssetTypeBadge from '../../components/AssetTypeBadge';
import ProjectSelector from '../../components/ProjectSelector';

const DEBOUNCE_MS = 400;

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const namespaceParam = searchParams.get('namespace') || undefined;

  const { searchAssets } = useCatalogApi();
  const [inputValue, setInputValue] = React.useState(queryParam);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searched, setSearched] = React.useState(!!queryParam);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = React.useCallback(
    async (query: string, namespace?: string) => {
      if (!query.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);
      try {
        const data = await searchAssets(query.trim(), namespace);
        setResults(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [searchAssets],
  );

  React.useEffect(() => {
    if (queryParam) {
      performSearch(queryParam, namespaceParam);
    }
  }, [queryParam, namespaceParam]);

  const handleInputChange = (_event: React.SyntheticEvent, value: string) => {
    setInputValue(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value.trim()) {
        params.set('q', value.trim());
      } else {
        params.delete('q');
      }
      setSearchParams(params, { replace: true });
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setInputValue('');
    setResults([]);
    setSearched(false);
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    setSearchParams(params, { replace: true });
  };

  const handleRowClick = (result: SearchResult) => {
    const typePath = result.type === 'TABLE' ? 'tables' : 'volumes';
    navigate(`/collections/${result.namespace}/${result.collection}/${typePath}/${result.name}`);
  };

  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      const key = `${r.namespace}/${r.collection}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    });
    return groups;
  }, [results]);

  return (
    <>
      <PageSection variant="light">
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to="/collections">Data Registry</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>Search</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" className="pf-v6-u-mt-md">
          Search Data Assets
        </Title>
      </PageSection>

      <PageSection variant="light" padding={{ default: 'noPadding' }}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <ProjectSelector />
            </ToolbarItem>
            <ToolbarItem variant="search-filter" widths={{ default: '400px' }}>
              <SearchInput
                placeholder="Search tables, volumes, properties..."
                value={inputValue}
                onChange={handleInputChange}
                onClear={handleClear}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        {loading && (
          <EmptyState>
            <EmptyStateHeader icon={<EmptyStateIcon icon={Spinner} />} titleText="Searching..." />
          </EmptyState>
        )}

        {!loading && error && (
          <EmptyState variant="lg">
            <EmptyStateHeader titleText="Search error" headingLevel="h2" />
            <EmptyStateBody>{error}</EmptyStateBody>
          </EmptyState>
        )}

        {!loading && !error && searched && results.length === 0 && (
          <EmptyState variant="lg">
            <EmptyStateHeader
              icon={<EmptyStateIcon icon={SearchIcon} />}
              titleText="No results found"
              headingLevel="h2"
            />
            <EmptyStateBody>
              No data assets match your search. Try different keywords or broaden your search.
            </EmptyStateBody>
          </EmptyState>
        )}

        {!loading && !error && !searched && (
          <EmptyState variant="lg">
            <EmptyStateHeader
              icon={<EmptyStateIcon icon={SearchIcon} />}
              titleText="Search the Data Registry"
              headingLevel="h2"
            />
            <EmptyStateBody>
              Enter a search term to find tables, volumes, and other data assets across all collections.
            </EmptyStateBody>
          </EmptyState>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <p className="pf-v6-u-mb-md pf-v6-u-color-200">
              {results.length} {results.length === 1 ? 'result' : 'results'} found
            </p>
            {Object.entries(groupedResults).map(([groupKey, groupResults]) => (
              <div key={groupKey} className="pf-v6-u-mb-lg">
                <Title headingLevel="h3" className="pf-v6-u-mb-sm">
                  {groupKey}
                </Title>
                <Table aria-label={`Results for ${groupKey}`} variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>Name</Th>
                      <Th>Description</Th>
                      <Th>Format</Th>
                      <Th>Updated</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {groupResults.map((result) => (
                      <Tr
                        key={`${result.type}-${result.name}`}
                        isClickable
                        onRowClick={() => handleRowClick(result)}
                      >
                        <Td><AssetTypeBadge type={result.type} /></Td>
                        <Td>{result.name}</Td>
                        <Td>{result.description || '—'}</Td>
                        <Td>{result.format || '—'}</Td>
                        <Td>{new Date(result.updatedAt).toLocaleDateString()}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            ))}
          </>
        )}
      </PageSection>
    </>
  );
};

export default SearchPage;
