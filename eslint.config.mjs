import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const compat = new FlatCompat({ baseDirectory, resolvePluginsRelativeTo: dirname(require.resolve("eslint-config-next/package.json")) });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"] },
];

export default eslintConfig;
