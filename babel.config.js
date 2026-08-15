module.exports = function (api) {
  api.cache(true);
  return {
    // Adds react-native-worklets/plugin itself when Reanimated is installed.
    presets: ['babel-preset-expo'],
  };
};
