import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Gallery,
  GalleryItem,
  PageSection,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { CubesIcon, SearchIcon } from '@patternfly/react-icons';
import { useCatalogApi, CollectionSummary } from '../../hooks/useCatalogApi';
import ProjectSelector from '../../components/ProjectSelector';

const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedNamespace = searchParams.get('namespace') || undefined;

  const { fetchCollections } = useCatalogApi();
  const [collections, setCollections] = React.useState<CollectionSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchValue, setSearchValue] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchCollections(selectedNamespace)
      .then((data) => {
        if (!cancelled) {
          setCollections(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNamespace]);

  const filteredCollections = React.useMemo(() => {
    if (!searchValue) {
      return collections;
    }
    const lower = searchValue.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.description?.toLowerCase().includes(lower),
    );
  }, [collections, searchValue]);

  const handleCardClick = (collection: CollectionSummary) => {
    navigate(`/collections/${collection.namespace}/${collection.name}`);
  };

  const handleSearchSubmit = () => {
    if (searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <>
      <PageSection variant="light">
        <Breadcrumb>
          <BreadcrumbItem isActive>Data Registry</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" className="pf-v6-u-mt-md">
          Data Registry
        </Title>
      </PageSection>

      <PageSection variant="light" padding={{ default: 'noPadding' }}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <ProjectSelector />
            </ToolbarItem>
            <ToolbarItem variant="search-filter">
              <SearchInput
                placeholder="Search collections..."
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onSearch={handleSearchSubmit}
                onClear={() => setSearchValue('')}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        {loading && (
          <EmptyState>
            <EmptyStateHeader icon={<EmptyStateIcon icon={Spinner} />} titleText="Loading collections" />
          </EmptyState>
        )}

        {error && (
          <EmptyState variant="lg">
            <EmptyStateHeader titleText="Error loading collections" headingLevel="h2" />
            <EmptyStateBody>{error}</EmptyStateBody>
          </EmptyState>
        )}

        {!loading && !error && filteredCollections.length === 0 && (
          <EmptyState variant="lg">
            <EmptyStateHeader
              icon={<EmptyStateIcon icon={searchValue ? SearchIcon : CubesIcon} />}
              titleText={searchValue ? 'No matching collections' : 'No collections found'}
              headingLevel="h2"
            />
            <EmptyStateBody>
              {searchValue
                ? 'Try adjusting your search criteria or clearing the filter.'
                : 'No data collections are available in the selected project. Create a collection to get started.'}
            </EmptyStateBody>
          </EmptyState>
        )}

        {!loading && !error && filteredCollections.length > 0 && (
          <Gallery hasGutter minWidths={{ default: '300px' }}>
            {filteredCollections.map((collection) => (
              <GalleryItem key={`${collection.namespace}/${collection.name}`}>
                <Card
                  isClickable
                  isSelectable
                  onClick={() => handleCardClick(collection)}
                >
                  <CardTitle>{collection.name}</CardTitle>
                  <CardBody>
                    {collection.description && (
                      <p className="pf-v6-u-mb-sm pf-v6-u-color-200">
                        {collection.description}
                      </p>
                    )}
                    <p className="pf-v6-u-font-size-sm pf-v6-u-color-200">
                      {collection.namespace}
                    </p>
                    <p className="pf-v6-u-mt-sm pf-v6-u-font-size-sm">
                      {collection.tableCount} {collection.tableCount === 1 ? 'table' : 'tables'}
                      {' · '}
                      {collection.volumeCount} {collection.volumeCount === 1 ? 'volume' : 'volumes'}
                    </p>
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

export default CollectionsPage;
