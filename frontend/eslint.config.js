import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/* Token enforcement for the frontend (designtokens.md 4.3):
   - DR-C1, DR-L5, DR-M1: no raw hex, rgb()/hsl(), px or ms values in components.
   - DR-K2: no Radix. DR-K1: Base UI only through src/components/ui.
   - DR-I1: icons come only from @phosphor-icons/react.
   Values that are missing from the token layer are added to src/styles/tokens first. */

const rawHex = {
  selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
  message: "Raw hex colour. Use a semantic token class such as text-primary-text (DR-C1).",
};
const rawHexTemplate = {
  selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
  message: "Raw hex colour. Use a semantic token class (DR-C1).",
};
const rawColorFunction = {
  selector: "Literal[value=/(rgb|rgba|hsl|hsla)\\(/]",
  message: "Raw colour function. Use a semantic token or var(--overlay) (DR-C1).",
};
const rawPx = {
  selector: "Literal[value=/\\b\\d+(\\.\\d+)?px\\b/]",
  message: "Raw pixel value. Use a space/size token, e.g. h-[var(--control-md)] (DR-L5).",
};
const rawPxTemplate = {
  selector: "TemplateElement[value.raw=/\\b\\d+(\\.\\d+)?px\\b/]",
  message: "Raw pixel value. Use a size token (DR-L5).",
};
const rawMs = {
  selector: "Literal[value=/\\b\\d+(\\.\\d+)?ms\\b/]",
  message: "Raw millisecond value. Use a duration token such as duration-[var(--duration-fast)] (DR-M1).",
};
const rawMsTemplate = {
  selector: "TemplateElement[value.raw=/\\b\\d+(\\.\\d+)?ms\\b/]",
  message: "Raw millisecond value. Use a duration token (DR-M1).",
};

const iconLibraries = {
  group: [
    "react-icons",
    "react-icons/*",
    "lucide-react",
    "heroicons",
    "@heroicons/*",
    "@mui/icons-material",
    "@mui/icons-material/*",
    "react-feather",
  ],
  message: "Icons come only from @phosphor-icons/react, through src/styles/icons.js (DR-I1).",
};

const radixPrimitives = {
  group: ["@radix-ui/*"],
  message: "Radix primitives are excluded from this project (DR-K2). Use a wrapper in src/components/ui.",
};

const baseUiOutsideWrappers = {
  group: [
    "@base-ui/react",
    "@base-ui/react/*",
    "@base-ui-components/react",
    "@base-ui-components/react/*",
  ],
  message: "Import Base UI only inside src/components/ui/ (DR-K1).",
};

export default [
  { ignores: ["dist/**", "dev-dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-restricted-syntax": [
        "error",
        rawHex,
        rawHexTemplate,
        rawColorFunction,
        rawPx,
        rawPxTemplate,
        rawMs,
        rawMsTemplate,
      ],
      "no-restricted-imports": [
        "error",
        { patterns: [iconLibraries, radixPrimitives, baseUiOutsideWrappers] },
      ],
    },
  },
  {
    // The wrapper layer is the one place allowed to reach a headless primitive (R1).
    files: ["src/components/ui/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [iconLibraries, radixPrimitives] },
      ],
    },
  },
  {
    // Context files export a provider component and its hook by design (auth.jsx).
    files: ["src/lib/**/*.{js,jsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
];
