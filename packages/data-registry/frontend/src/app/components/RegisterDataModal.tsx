/* eslint-disable camelcase */
import React from 'react';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  Alert,
  Content,
} from '@patternfly/react-core';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createVolume,
  createGenericTable,
  createLabel,
  isConflictError,
} from '~/app/api/dataRegistry';
import {
  CreateVolumeRequest,
  CreateGenericTableRequest,
  ConnectionModel,
  ConnectionRef,
  UnstructuredFormat,
  StructuredFormat,
} from '~/app/types';
import { useConnections } from '~/app/hooks/useConnections';
import { useDataRegistryTrackEvent } from '~/app/hooks/useDataRegistryTrackEvent';
import {
  registerDataSchema,
  registerDataDefaults,
  RegisterDataFormData,
} from '~/app/schemas/registerData.schema';
import { DATA_REGISTRY_EVENT_NAMES, getRegistrationErrorCategory } from '~/app/utilities/tracking';
import AssetDetailsSection from './register-data/AssetDetailsSection';
import DataLocationSection from './register-data/DataLocationSection';
import PropertiesSection from './register-data/PropertiesSection';
import CustomPropertiesSection from './register-data/CustomPropertiesSection';
import SchemaSection from './register-data/SchemaSection';

type RegisterDataModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  collections: string[];
  onCreated: () => void;
  onManageCollections: () => void;
};

const getConnectionRef = (
  connection: string,
  connections: ConnectionModel[],
): ConnectionRef | undefined => {
  if (!connection) {
    return undefined;
  }
  const selectedConnection = connections.find((c) => c.name === connection);
  const isDch = selectedConnection?.connectionType?.toLowerCase() === 'dch';
  return isDch ? { type: 'dch', id: connection } : { type: 'rhai', secret_name: connection };
};

type SharedCreateAssetRequest = Omit<CreateVolumeRequest, 'format'> & { format: string };

const UNSTRUCTURED_FORMAT_VALUES: UnstructuredFormat[] = [
  'documents',
  'images',
  'audio',
  'video',
  'binary',
  'other',
];

const STRUCTURED_FORMAT_VALUES: StructuredFormat[] = [
  'iceberg',
  'parquet',
  'csv',
  'delta',
  'postgresql',
  'milvus',
  'other',
];

const isUnstructuredFormat = (format: string): format is UnstructuredFormat =>
  UNSTRUCTURED_FORMAT_VALUES.some((value) => value === format);

const isStructuredFormat = (format: string): format is StructuredFormat =>
  STRUCTURED_FORMAT_VALUES.some((value) => value === format);

const buildSharedAssetRequest = (
  data: RegisterDataFormData,
  connections: ConnectionModel[],
): SharedCreateAssetRequest => {
  const request: SharedCreateAssetRequest = {
    name: data.name.trim(),
    format: data.format,
  };
  if (data.description) {
    request.description = data.description;
  }
  if (data.path && data.path !== '/') {
    request.storage_location = data.path;
  }
  if (data.connection) {
    request.connection_ref = getConnectionRef(data.connection, connections);
  }
  if (data.labels.length > 0) {
    request.labels = data.labels;
  }
  const properties: Record<string, string> = {};
  if (data.purpose) {
    request.purpose = data.purpose;
  }
  if (data.license) {
    request.license = data.license;
  }
  if (data.maturity) {
    request.maturity = data.maturity;
  }
  if (data.domain) {
    request.domain = data.domain;
  }
  if (data.piiStatus) {
    request.pii = data.piiStatus;
  }
  data.customProperties.forEach((prop) => {
    if (prop.key && prop.value) {
      properties[prop.key] = prop.value;
    }
  });
  if (Object.keys(properties).length > 0) {
    request.properties = properties;
  }
  return request;
};

const buildVolumeRequest = (
  data: RegisterDataFormData,
  connections: ConnectionModel[],
): CreateVolumeRequest => {
  const format = isUnstructuredFormat(data.format) ? data.format : 'other';
  return { ...buildSharedAssetRequest(data, connections), format };
};

const buildTableRequest = (
  data: RegisterDataFormData,
  connections: ConnectionModel[],
): CreateGenericTableRequest => {
  const request: CreateGenericTableRequest = {
    ...buildSharedAssetRequest(data, connections),
    format: isStructuredFormat(data.format) ? data.format : 'other',
  };

  const filteredFields = data.schemaFields
    .filter((col) => col.name && col.type)
    .map((col) => ({
      name: col.name,
      type: col.type,
      ...(col.description ? { description: col.description } : {}),
      nullable: col.nullable,
    }));
  if (filteredFields.length > 0) {
    request.schema_fields = filteredFields;
  }
  return request;
};

const RegisterDataModal: React.FC<RegisterDataModalProps> = ({
  isOpen,
  onClose,
  project,
  collections,
  onCreated,
  onManageCollections,
}) => {
  const [connections, connectionsLoaded, connectionsError] = useConnections(project);
  const trackEvent = useDataRegistryTrackEvent();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const form = useForm<RegisterDataFormData>({
    resolver: zodResolver(registerDataSchema),
    defaultValues: registerDataDefaults,
    mode: 'onBlur',
  });

  const handleDismiss = React.useCallback(
    (cancelMethod: 'cancel_button' | 'close_x') => {
      if (isSubmitting) {
        return;
      }
      trackEvent({
        eventName: DATA_REGISTRY_EVENT_NAMES.registrationCanceled,
        properties: { cancelMethod, project },
      });
      form.reset(registerDataDefaults);
      setIsSubmitting(false);
      setError('');
      onClose();
    },
    [form, isSubmitting, onClose, project, trackEvent],
  );

  const handleClose = React.useCallback(() => {
    handleDismiss('close_x');
  }, [handleDismiss]);

  const handleCancel = React.useCallback(() => {
    handleDismiss('cancel_button');
  }, [handleDismiss]);

  const handleSubmit = React.useCallback(
    async (data: RegisterDataFormData) => {
      setIsSubmitting(true);
      setError('');
      try {
        if (data.labels.length > 0) {
          await Promise.all(
            data.labels.map((label) =>
              createLabel(project, { name: label }).catch((err) => {
                if (isConflictError(err)) {
                  return;
                }
                throw err;
              }),
            ),
          );
        }
        if (data.assetType === 'unstructured') {
          await createVolume(project, data.collection, buildVolumeRequest(data, connections));
        } else {
          await createGenericTable(project, data.collection, buildTableRequest(data, connections));
        }
        trackEvent({
          eventName: DATA_REGISTRY_EVENT_NAMES.registered,
          properties: {
            success: true,
            assetType: data.assetType,
            format: data.format,
            hasConnection: Boolean(data.connection),
            hasCollection: Boolean(data.collection),
            labelCount: data.labels.length,
            project,
          },
        });
        form.reset(registerDataDefaults);
        onCreated();
        onClose();
      } catch (err) {
        trackEvent({
          eventName: DATA_REGISTRY_EVENT_NAMES.registered,
          properties: {
            success: false,
            assetType: data.assetType,
            format: data.format,
            hasConnection: Boolean(data.connection),
            hasCollection: Boolean(data.collection),
            labelCount: data.labels.length,
            project,
            error: getRegistrationErrorCategory(err),
          },
        });
        setError(err instanceof Error ? err.message : 'Failed to register data asset');
      } finally {
        setIsSubmitting(false);
      }
    },
    [connections, form, onClose, onCreated, project, trackEvent],
  );

  const assetType = form.watch('assetType');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="medium" data-testid="register-data-modal">
      <ModalHeader
        title="Register data"
        description={
          <Content component="p">
            Create a new data asset and configure its source location, metadata, and schema.
          </Content>
        }
      />
      <ModalBody>
        {error ? (
          <Alert variant="danger" isInline title="Error registering data asset">
            {error}
          </Alert>
        ) : null}
        <FormProvider {...form}>
          <Form>
            <AssetDetailsSection
              collections={collections}
              onManageCollections={onManageCollections}
              project={project}
            />
            <DataLocationSection
              connections={connections}
              connectionsLoaded={connectionsLoaded}
              connectionsError={connectionsError}
              showConnection
              project={project}
            />
            <PropertiesSection />
            <CustomPropertiesSection />
            {assetType === 'structured' ? <SchemaSection /> : null}
          </Form>
        </FormProvider>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Register"
          onSubmit={form.handleSubmit(handleSubmit)}
          onCancel={handleCancel}
          isSubmitDisabled={isSubmitting}
          isSubmitLoading={isSubmitting}
          isCancelDisabled={isSubmitting}
          submitButtonTestId="register-data-submit"
        />
      </ModalFooter>
    </Modal>
  );
};

export default RegisterDataModal;
