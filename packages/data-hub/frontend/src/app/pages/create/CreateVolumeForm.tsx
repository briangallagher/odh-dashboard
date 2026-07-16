import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ActionGroup,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import { useCatalogApi, CreateVolumeRequest } from '../../hooks/useCatalogApi';

const VOLUME_TYPES = ['S3', 'GCS', 'AZURE_BLOB', 'NFS', 'PVC'];

interface PropertyEntry {
  key: string;
  value: string;
}

const CreateVolumeForm: React.FC = () => {
  const { namespace, collection } = useParams<{ namespace: string; collection: string }>();
  const navigate = useNavigate();
  const { createVolume } = useCatalogApi();

  const [name, setName] = React.useState('');
  const [storageLocation, setStorageLocation] = React.useState('');
  const [volumeType, setVolumeType] = React.useState('S3');
  const [volumeTypeOpen, setVolumeTypeOpen] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [properties, setProperties] = React.useState<PropertyEntry[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!namespace || !collection) return null;

  const handleAddProperty = () => {
    setProperties([...properties, { key: '', value: '' }]);
  };

  const handleRemoveProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const handlePropertyChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...properties];
    updated[index] = { ...updated[index], [field]: value };
    setProperties(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !storageLocation.trim()) {
      setError('Name and storage location are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const validProps: Record<string, string> = {};
    properties.forEach((p) => {
      if (p.key.trim()) {
        validProps[p.key.trim()] = p.value;
      }
    });

    const request: CreateVolumeRequest = {
      name: name.trim(),
      volumeType,
      storageLocation: storageLocation.trim(),
      description: description.trim() || undefined,
      properties: Object.keys(validProps).length > 0 ? validProps : undefined,
    };

    try {
      await createVolume(namespace, collection, request);
      navigate(`/collections/${namespace}/${collection}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create volume');
    } finally {
      setSubmitting(false);
    }
  };

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
          <BreadcrumbItem isActive>Create Volume</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" className="pf-v6-u-mt-md">
          Create Volume
        </Title>
      </PageSection>

      <PageSection>
        <Form isWidthLimited>
          <FormGroup label="Name" isRequired fieldId="volume-name">
            <TextInput
              id="volume-name"
              isRequired
              value={name}
              onChange={(_event, val) => setName(val)}
              placeholder="my-volume"
            />
          </FormGroup>

          <FormGroup label="Storage Location" isRequired fieldId="volume-location">
            <TextInput
              id="volume-location"
              isRequired
              value={storageLocation}
              onChange={(_event, val) => setStorageLocation(val)}
              placeholder="s3://bucket/path or /mnt/nfs/share"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>URI or path to the storage location</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Volume Type" isRequired fieldId="volume-type">
            <Select
              id="volume-type"
              isOpen={volumeTypeOpen}
              selected={volumeType}
              onSelect={(_event, value) => {
                setVolumeType(value as string);
                setVolumeTypeOpen(false);
              }}
              onOpenChange={setVolumeTypeOpen}
              toggle={(toggleRef) => (
                <MenuToggle ref={toggleRef} onClick={() => setVolumeTypeOpen(!volumeTypeOpen)} isExpanded={volumeTypeOpen}>
                  {volumeType}
                </MenuToggle>
              )}
            >
              <SelectList>
                {VOLUME_TYPES.map((vt) => (
                  <SelectOption key={vt} value={vt}>
                    {vt}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>

          <FormGroup label="Description" fieldId="volume-description">
            <TextArea
              id="volume-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
              placeholder="Brief description of this volume"
              rows={3}
            />
          </FormGroup>

          {/* Properties Section */}
          <Title headingLevel="h3" className="pf-v6-u-mt-lg">
            Properties
          </Title>
          {properties.length > 0 && (
            <Table aria-label="Properties definition" variant="compact">
              <Thead>
                <Tr>
                  <Th>Key</Th>
                  <Th>Value</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {properties.map((prop, index) => (
                  <Tr key={index}>
                    <Td>
                      <TextInput
                        aria-label={`Property ${index} key`}
                        value={prop.key}
                        onChange={(_event, val) => handlePropertyChange(index, 'key', val)}
                        placeholder="property.key"
                      />
                    </Td>
                    <Td>
                      <TextInput
                        aria-label={`Property ${index} value`}
                        value={prop.value}
                        onChange={(_event, val) => handlePropertyChange(index, 'value', val)}
                        placeholder="value"
                      />
                    </Td>
                    <Td>
                      <Button
                        variant="plain"
                        aria-label="Remove property"
                        onClick={() => handleRemoveProperty(index)}
                      >
                        <TrashIcon />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddProperty}>
            Add property
          </Button>

          {error && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{error}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}

          <ActionGroup>
            <Button variant="primary" onClick={handleSubmit} isLoading={submitting} isDisabled={submitting}>
              Create Volume
            </Button>
            <Button
              variant="link"
              onClick={() => navigate(`/collections/${namespace}/${collection}`)}
              isDisabled={submitting}
            >
              Cancel
            </Button>
          </ActionGroup>
        </Form>
      </PageSection>
    </>
  );
};

export default CreateVolumeForm;
