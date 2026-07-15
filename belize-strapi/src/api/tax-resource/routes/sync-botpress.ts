export default {
  routes: [
    {
      method: 'POST',
      path: '/botpress/sync-tax-resources-all-locales',
      handler: 'tax-resource.syncAllToBotpress',
      config: {
        auth: false,
      },
    },
  ],
};
