import DynamicPathPage from "@/components/DynamicPathPage";

// Required for static export with dynamic routes
// Return only empty path - all other routes are handled client-side
// This allows for fully dynamic routes (drives, files, directories)
export function generateStaticParams() {
  // Only generate the root catch-all route
  // All other paths (drives, files, directories) are handled dynamically via client-side routing
  return [{ path: [] }];
}

export default function Page() {
  return <DynamicPathPage />;
}
