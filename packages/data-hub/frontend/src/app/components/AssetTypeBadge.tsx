import React from 'react';
import { Label } from '@patternfly/react-core';
import { DatabaseIcon, FolderIcon } from '@patternfly/react-icons';

interface AssetTypeBadgeProps {
  type: 'TABLE' | 'VOLUME';
}

const AssetTypeBadge: React.FC<AssetTypeBadgeProps> = ({ type }) => {
  if (type === 'TABLE') {
    return (
      <Label color="blue" icon={<DatabaseIcon />} isCompact>
        TABLE
      </Label>
    );
  }

  return (
    <Label color="green" icon={<FolderIcon />} isCompact>
      VOLUME
    </Label>
  );
};

export default AssetTypeBadge;
