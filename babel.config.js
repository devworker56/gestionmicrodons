module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['react-native-worklets-core/plugin'], 
    'react-native-reanimated/plugin', // Reanimated 4 handles its own worklets now
  ],
};