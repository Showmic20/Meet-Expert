// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      // add 'nativewind/babel' here ONLY if you actually use NativeWind
      'react-native-reanimated/plugin' // MUST be last
    ],
  };
};
