import type { Extension } from '@odh-dashboard/plugin-core/extension-points';

const extensions: Extension[] = [
  {
    type: 'app.area',
    properties: { id: 'plugin-data-hub', featureFlags: ['dataHub'] },
  },
  {
    type: 'app.navigation/section',
    flags: { required: ['plugin-data-hub'] },
    properties: {
      id: 'data-hub',
      title: 'Data Registry',
      group: '1_data_hub',
      section: 'ai-hub',
    },
  },
  {
    type: 'app.navigation/href',
    flags: { required: ['plugin-data-hub'] },
    properties: {
      id: 'data-hub-collections',
      title: 'Collections',
      href: '/ai-hub/data/collections',
      section: 'data-hub',
      path: '/ai-hub/data/*',
    },
  },
  {
    type: 'app.route',
    flags: { required: ['plugin-data-hub'] },
    properties: {
      path: '/ai-hub/data/*',
      component: () => import('./DataHubWrapper'),
    },
  },
];

export default extensions;
