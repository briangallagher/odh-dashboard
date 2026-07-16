import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Spinner,
} from '@patternfly/react-core';
import { useAccessibleNamespaces } from '../hooks/useAccessibleNamespaces';

const ALL_PROJECTS = '__all__';

const ProjectSelector: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentNamespace = searchParams.get('namespace') || ALL_PROJECTS;
  const { namespaces, loading } = useAccessibleNamespaces();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
    const selected = value as string;
    const params = new URLSearchParams(searchParams);

    if (selected === ALL_PROJECTS) {
      params.delete('namespace');
    } else {
      params.set('namespace', selected);
    }

    setSearchParams(params, { replace: true });
    setIsOpen(false);
  };

  const toggleLabel = currentNamespace === ALL_PROJECTS
    ? 'All projects'
    : currentNamespace;

  return (
    <Select
      isOpen={isOpen}
      selected={currentNamespace}
      onSelect={handleSelect}
      onOpenChange={setIsOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          style={{ minWidth: '200px' }}
        >
          {loading ? <Spinner size="sm" /> : toggleLabel}
        </MenuToggle>
      )}
    >
      <SelectList>
        <SelectOption value={ALL_PROJECTS}>All projects</SelectOption>
        {namespaces.map((ns) => (
          <SelectOption key={ns} value={ns}>
            {ns}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default ProjectSelector;
