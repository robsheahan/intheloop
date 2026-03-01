module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [require.resolve("babel-preset-expo"), { jsxImportSource: "nativewind", "react-compiler": false }],
      "nativewind/babel",
    ],
    plugins: [
      // Manually include expo-router babel plugin since babel-preset-expo's
      // hasModule('expo-router') check fails when hoisted in a monorepo
      require("babel-preset-expo/build/expo-router-plugin").expoRouterBabelPlugin,
    ],
  };
};
