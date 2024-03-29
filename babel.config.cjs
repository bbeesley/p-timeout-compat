module.exports = function configureBabel(api) {
  const isTest = api.env('test');
  api.cache(true); // this tells babel to cache it's transformations, it's pretty good at checking file hashes and invalidating it's cache, but if you have problems with changes not being reflected you can set false here.

  const presets = [
    [
      '@babel/preset-env', // this plugin tells babel to transpile your code for a specific runtime environment, we'll use node
      {
        targets: {
          node: '12.13.0',
        },
        modules: isTest ? 'cjs' : false,
      },
    ],
  ];

  const plugins = [];

  return {
    presets,
    plugins,
  };
};
