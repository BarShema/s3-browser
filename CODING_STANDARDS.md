# Coding Standards

This document defines the coding standards for the IDITS Drive project to ensure consistency across the codebase.

## File Naming

- **Components**: Use PascalCase (e.g., `PageHeader.tsx`, `FileExplorer.tsx`)
- **Hooks**: Use camelCase with `use` prefix (e.g., `useLogout.ts`, `useResize.ts`)
- **Utilities**: Use camelCase (e.g., `utils.ts`, `clz.ts`)
- **CSS Modules**: Match component name (e.g., `PageHeader.module.css`)

## Import Organization

Imports should be organized in the following order with blank lines between groups:

1. **React and React hooks**
   ```typescript
   import { useEffect, useState } from "react";
   ```

2. **Next.js imports**
   ```typescript
   import { useRouter } from "next/navigation";
   import Link from "next/link";
   ```

3. **Third-party libraries** (alphabetically sorted)
   ```typescript
   import { Loader2, X } from "lucide-react";
   import toast from "react-hot-toast";
   ```

4. **Local imports** (grouped by type, alphabetically sorted within groups)
   - Config
   - Contexts
   - Hooks
   - Lib/Utils
   - Components
   - Styles
   ```typescript
   import { appConfig } from "@/config/app";
   import { useAuth } from "@/contexts/AuthContext";
   import { api } from "@/lib/api";
   import { FileItem } from "@/lib/utils";
   import { Breadcrumb } from "@/components/Breadcrumb";
   import styles from "./component.module.css";
   ```

## Component Structure

```typescript
"use client"; // If needed

// Imports (organized as above)

// Interfaces/Types
interface ComponentProps {
  // Props definition
}

// Component
export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // Handlers
  const handleAction = () => {
    // Handler logic
  };
  
  // Render
  return (
    // JSX
  );
}
```

## Error Handling

- Always use `error` as the variable name in catch blocks (not `err`, `e`, etc.)
- Use consistent error handling patterns:
  ```typescript
  try {
    // Operation
  } catch (error) {
    // Error handling
    toast.error("User-friendly error message");
  } finally {
    // Cleanup if needed
  }
  ```

## Interface Exports

- Export interfaces that are used by other components
- Keep internal interfaces non-exported
- Use `Props` suffix for component props interfaces

## CSS Module Imports

- Always use `styles` as the import name for the primary CSS module
- Import styles at the end of the import section
- **Exception**: When a component uses multiple CSS modules, use `styles` for the primary/component-specific CSS module, and use descriptive names (e.g., `modalStyles`, `uploadStyles`) for shared or secondary CSS modules

## Comments

- Use clear, concise comments
- Prefer self-documenting code over comments
- Use JSDoc comments for exported functions/classes
- Remove commented-out code before committing

## Code Cleanliness

- **Never keep unused code**: Remove all unused variables, functions, files, and imports
- Unused code creates confusion, increases maintenance burden, and can lead to bugs
- Before committing, ensure:
  - All unused variables are removed
  - All unused functions are removed
  - All unused files are deleted
  - All unused imports are removed
  - All linter warnings about unused code are resolved
- If code is temporarily unused but may be needed later, add a TODO comment explaining why it's kept, otherwise remove it

## TypeScript

- Use explicit types for function parameters and return types
- Prefer `interface` over `type` for object shapes
- Use `as const` for literal types when appropriate
- **Never use `any`** - use `unknown` or proper types instead
- **No inline types** - Always declare types/interfaces separately, do not use inline object types in function parameters or return types
  - ❌ Bad: `function process(data: { name: string; age: number }) { ... }`
  - ✅ Good: 
    ```typescript
    interface ProcessData {
      name: string;
      age: number;
    }
    function process(data: ProcessData) { ... }
    ```

## Async/Await

- Always use async/await over Promise chains
- Use try/catch for error handling
- Use finally blocks for cleanup when needed

## Naming Conventions

- **Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE or camelCase (depending on context)
- **Interfaces/Types**: PascalCase
- **Files**: Match the primary export (PascalCase for components)

