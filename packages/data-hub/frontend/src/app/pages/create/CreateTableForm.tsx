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
import { useCatalogApi, ColumnSchema, CreateTableRequest } from '../../hooks/useCatalogApi';

const TABLE_FORMATS = ['ICEBERG', 'PARQUET', 'DELTA', 'CSV', 'ORC', 'AVRO'];

interface PropertyEntry {
  key: string;
  value: string;
}

const CreateTableForm: React.FC = () => {
  const { namespace, collection } = useParams<{ namespace: string; collection: string }>();
  const navigate = useNavigate();
  const { createTable } = useCatalogApi();

  const [name, setName] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [format, setFormat] = React.useState('ICEBERG');
  const [formatOpen, setFormatOpen] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [connectionRef, setConnectionRef] = React.useState('');
  const [schema, setSchema] = React.useState<ColumnSchema[]>([{ name: '', type: '', description: '' }]);
  const [properties, setProperties] = React.useState<PropertyEntry[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!namespace || !collection) return null;

  const handleAddColumn = () => {
    setSchema([...schema, { name: '', type: '', description: '' }]);
  };

  const handleRemoveColumn = (index: number) => {
    setSchema(schema.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, field: keyof ColumnSchema, value: string) => {
    const updated = [...schema];
    updated[index] = { ...updated[index], [field]: value };
    setSchema(updated);
  };

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
    if (!name.trim() || !location.trim()) {
      setError('Name and location are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const validSchema = schema.filter((col) => col.name.trim() && col.type.trim());
    const validProps: Record<string, string> = {};
    properties.forEach((p) => {
      if (p.key.trim()) {
        validProps[p.key.trim()] = p.value;
      }
    });

    const request: CreateTableRequest = {
      name: name.trim(),
      format,
      location: location.trim(),
      description: description.trim() || undefined,
      schema: validSchema,
      properties: Object.keys(validProps).length > 0 ? validProps : undefined,
      connectionRef: connectionRef.trim() || undefined,
    };

    try {
      await createTable(namespace, collection, request);
      navigate(`/collections/${namespace}/${collection}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table');
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
          <BreadcrumbItem isActive>Create Table</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" className="pf-v6-u-mt-md">
          Create Table
        </Title>
      </PageSection>

      <PageSection>
        <Form isWidthLimited>
          <FormGroup label="Name" isRequired fieldId="table-name">
            <TextInput
              id="table-name"
              isRequired
              value={name}
              onChange={(_event, val) => setName(val)}
              placeholder="my-dataset"
            />
          </FormGroup>

          <FormGroup label="Location" isRequired fieldId="table-location">
            <TextInput
              id="table-location"
              isRequired
              value={location}
              onChange={(_event, val) => setLocation(val)}
              placeholder="s3://bucket/path/to/data"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>S3, GCS, or HDFS path to the data</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Format" isRequired fieldId="table-format">
            <Select
              id="table-format"
              isOpen={formatOpen}
              selected={format}
              onSelect={(_event, value) => {
                setFormat(value as string);
                setFormatOpen(false);
              }}
              onOpenChange={setFormatOpen}
              toggle={(toggleRef) => (
                <MenuToggle ref={toggleRef} onClick={() => setFormatOpen(!formatOpen)} isExpanded={formatOpen}>
                  {format}
                </MenuToggle>
              )}
            >
              <SelectList>
                {TABLE_FORMATS.map((f) => (
                  <SelectOption key={f} value={f}>
                    {f}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>

          <FormGroup label="Description" fieldId="table-description">
            <TextArea
              id="table-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
              placeholder="Brief description of this table"
              rows={3}
            />
          </FormGroup>

          <FormGroup label="Connection Reference" fieldId="table-connection-ref">
            <TextInput
              id="table-connection-ref"
              value={connectionRef}
              onChange={(_event, val) => setConnectionRef(val)}
              placeholder="data-connection-name"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>RHOAI Data Connection used to access this table</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {/* Schema Section */}
          <Title headingLevel="h3" className="pf-v6-u-mt-lg">
            Schema
          </Title>
          <Table aria-label="Schema definition" variant="compact">
            <Thead>
              <Tr>
                <Th>Column Name</Th>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {schema.map((col, index) => (
                <Tr key={index}>
                  <Td>
                    <TextInput
                      aria-label={`Column ${index} name`}
                      value={col.name}
                      onChange={(_event, val) => handleColumnChange(index, 'name', val)}
                      placeholder="column_name"
                    />
                  </Td>
                  <Td>
                    <TextInput
                      aria-label={`Column ${index} type`}
                      value={col.type}
                      onChange={(_event, val) => handleColumnChange(index, 'type', val)}
                      placeholder="string, int, float..."
                    />
                  </Td>
                  <Td>
                    <TextInput
                      aria-label={`Column ${index} description`}
                      value={col.description || ''}
                      onChange={(_event, val) => handleColumnChange(index, 'description', val)}
                      placeholder="Optional description"
                    />
                  </Td>
                  <Td>
                    <Button
                      variant="plain"
                      aria-label="Remove column"
                      onClick={() => handleRemoveColumn(index)}
                      isDisabled={schema.length <= 1}
                    >
                      <TrashIcon />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddColumn}>
            Add column
          </Button>

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
              Create Table
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

export default CreateTableForm;
