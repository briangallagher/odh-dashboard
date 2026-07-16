module.exports = {
  exposes: {
    './extensions': './src/odh/extensions',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
    'react-router-dom': { singleton: true },
    '@patternfly/react-core': { singleton: true },
  },
};
