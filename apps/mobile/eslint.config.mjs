import { config as reactConfig } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactConfig,
  {
    rules: {
      // React Native specific overrides
      "react/react-in-jsx-scope": "off",
    },
  },
];
