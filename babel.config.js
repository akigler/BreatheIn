module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated plugin removed - using React Native's built-in Animated API instead
    ],
  };
};
