module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo adds react-native-worklets/plugin itself when Reanimated
    // is installed, so Reanimated 4 needs no extra entry here.
    presets: ['babel-preset-expo'],
  };
};
