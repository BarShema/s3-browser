"use client";

import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./directoryTree.module.css";

interface DirectoryNode {
  key: string;
  name: string;
  children?: DirectoryNode[];
  isExpanded?: boolean;
  level: number;
  isEmpty?: boolean;
}

interface DirectoryTreeProps {
  bucketName: string;
  currentPath: string;
  onPathClick: (path: string) => void;
  isVisible: boolean;
}

export function DirectoryTree({
  bucketName,
  currentPath,
  onPathClick,
  isVisible,
}: DirectoryTreeProps) {
  const [treeData, setTreeData] = useState<DirectoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loadedNodes, setLoadedNodes] = useState<Set<string>>(new Set());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);
  const currentPathRef = useRef(currentPath);
  const hasInitializedRef = useRef(hasInitialized);

  // Update refs when values change
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    hasInitializedRef.current = hasInitialized;
  }, [hasInitialized]);

  // Fetch directory structure
  const fetchDirectoryStructure = useCallback(async () => {
    if (!bucketName) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/s3?path=${bucketName}&limit=1000`);
      const data = await response.json();

      console.log("DirectoryTree API Response:", data);

      if (data.directories) {
        const tree = buildTreeStructure(data.directories);
        console.log({ tree });
        setTreeData(tree);

        // Note: Auto-expansion to current path is handled in useEffect below
      } else {
        console.log("No directories found in response:", data);
        setTreeData([]);
      }
    } catch (error) {
      console.error("Error fetching directory structure:", error);
    } finally {
      setIsLoading(false);
    }
  }, [bucketName]);

  // Load subdirectories for a specific directory
  const loadSubdirectories = useCallback(
    async (directoryKey: string) => {
      if (
        !bucketName ||
        loadedNodes.has(directoryKey) ||
        loadingNodes.has(directoryKey)
      ) {
        return;
      }

      setLoadingNodes((prev) => new Set(prev).add(directoryKey));

      try {
        const response = await fetch(
          `/api/s3?path=${bucketName}/${directoryKey}&limit=1000`
        );
        const data = await response.json();

        console.log(`Loading subdirectories for ${directoryKey}:`, data);

        // Filter out the origin directory and any parent directories from the results
        const filteredDirectories =
          data.directories?.filter((dir: { key: string; name: string }) => {
            // Remove the origin directory itself
            if (dir.key === directoryKey) return false;

            // Remove any directories that are not direct children
            // A direct child should have the parent path as a prefix and only one additional segment
            const parentPath = directoryKey.endsWith("/")
              ? directoryKey
              : directoryKey + "/";
            if (!dir.key.startsWith(parentPath)) return false;

            // Check if it's a direct child (only one additional path segment)
            const relativePath = dir.key.substring(parentPath.length);
            const pathSegments = relativePath.split("/").filter(Boolean);

            return pathSegments.length === 1;
          }) || [];

        // Update the tree structure to include subdirectories
        setTreeData((prevTree) => {
          const updateNode = (nodes: DirectoryNode[]): DirectoryNode[] => {
            return nodes.map((node) => {
              if (node.key === directoryKey) {
                return {
                  ...node,
                  children: filteredDirectories.map(
                    (dir: { key: string; name: string }) => ({
                      key: dir.key,
                      name: dir.name,
                      level: node.level + 1,
                      children: [],
                    })
                  ),
                  isEmpty: filteredDirectories.length === 0,
                };
              }
              if (node.children) {
                return {
                  ...node,
                  children: updateNode(node.children),
                };
              }
              return node;
            });
          };
          return updateNode(prevTree);
        });

        setLoadedNodes((prev) => new Set(prev).add(directoryKey));
      } catch (error) {
        console.error(
          `Error loading subdirectories for ${directoryKey}:`,
          error
        );
      } finally {
        setLoadingNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(directoryKey);
          return newSet;
        });
      }
    },
    [bucketName, loadedNodes, loadingNodes]
  );

  // Build hierarchical tree structure from flat directory list
  const buildTreeStructure = (
    directories: { key: string; name: string }[]
  ): DirectoryNode[] => {
    const nodeMap = new Map<string, DirectoryNode>();
    const rootNodes: DirectoryNode[] = [];

    // First, create nodes for all directories
    directories.forEach((dir) => {
      const pathParts = dir.key.split("/").filter(Boolean);
      const node: DirectoryNode = {
        key: dir.key,
        name: dir.name,
        level: pathParts.length - 1,
        children: [],
      };
      nodeMap.set(dir.key, node);
    });

    // Then build parent-child relationships
    directories.forEach((dir) => {
      const node = nodeMap.get(dir.key);
      if (!node) return;

      const pathParts = dir.key.split("/").filter(Boolean);
      if (pathParts.length === 1) {
        // Root level directory
        rootNodes.push(node);
      } else {
        // Find parent directory
        const parentPath = pathParts.slice(0, -1).join("/");
        const parentNode = nodeMap.get(parentPath);
        if (parentNode) {
          parentNode.children = parentNode.children || [];
          parentNode.children.push(node);
        } else {
          // If parent doesn't exist in the map, it's a root level directory
          rootNodes.push(node);
        }
      }
    });

    // Sort children alphabetically
    const sortChildren = (nodes: DirectoryNode[]): DirectoryNode[] => {
      return nodes
        .map((node) => ({
          ...node,
          children: node.children ? sortChildren(node.children) : [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    return sortChildren(rootNodes);
  };

  // Expand path to current location and load necessary directories
  const expandToPath = useCallback(
    async (path: string) => {
      if (!path || !bucketName) return;

      const pathParts = path.split("/").filter(Boolean);
      const expandedSet = new Set<string>();

      // Add all parent paths to expanded set
      for (let i = 1; i <= pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i).join("/");
        expandedSet.add(parentPath);
      }

      setExpandedNodes(expandedSet);

      // Load subdirectories for each parent directory sequentially
      // This ensures that nested directories are available before we try to expand them
      for (let i = 1; i < pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i).join("/");
        if (!loadedNodes.has(parentPath)) {
          await loadSubdirectories(parentPath);
          // Small delay to ensure tree structure is updated
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    },
    [bucketName, loadedNodes, loadSubdirectories]
  );

  // Toggle node expansion
  const toggleNode = (nodeKey: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeKey)) {
      newExpanded.delete(nodeKey);
    } else {
      newExpanded.add(nodeKey);
      // Load subdirectories if not already loaded
      if (!loadedNodes.has(nodeKey)) {
        loadSubdirectories(nodeKey);
      }
    }
    setExpandedNodes(newExpanded);
  };

  // Render tree node
  const renderNode = (node: DirectoryNode): JSX.Element => {
    const isExpanded = expandedNodes.has(node.key);
    const isCurrentPath = currentPath === node.key;
    const hasChildren = node.children && node.children.length > 0;
    const isLoading = loadingNodes.has(node.key);

    return (
      <div key={node.key} className={styles.node}>
        <div
          className={`${styles.nodeContent} ${
            isCurrentPath ? styles.currentPath : ""
          }`}
          style={{ paddingLeft: `${node.level * 16 + 8}px` }}
        >
          {/* Plus icon for loading subdirectories */}
          <button
            className={styles.expandButton}
            onClick={() => toggleNode(node.key)}
            disabled={isLoading}
            title={
              isLoading ? "Loading..." : isExpanded ? "Collapse" : "Expand"
            }
          >
            {isLoading ? (
              <div className={styles.loadingSpinner}>⟳</div>
            ) : isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>

          <button
            className={styles.folderButton}
            onClick={() => onPathClick(node.key)}
            title={node.key}
          >
            {isExpanded ? (
              <FolderOpen size={16} className={styles.folderIcon} />
            ) : (
              <Folder size={16} className={styles.folderIcon} />
            )}
            <span className={styles.folderName}>{node.name}</span>
          </button>
        </div>

        {isExpanded && (
          <div className={styles.children}>
            {hasChildren ? (
              node.children!.map((child) => renderNode(child))
            ) : (
              <div className={styles.emptyDirectory}>
                <span className={styles.emptyText}>Empty</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Load directory structure on mount and when bucket changes
  useEffect(() => {
    setHasInitialized(false); // Reset initialization state when bucket changes
    fetchDirectoryStructure();
  }, [fetchDirectoryStructure]);

  // Expand to current path when it changes (only on first load)
  useEffect(() => {
    if (currentPath && treeData.length > 0 && !hasInitialized) {
      const expandPath = async () => {
        await expandToPath(currentPath);
        setHasInitialized(true);
      };
      expandPath();
    } else if (!currentPath && treeData.length > 0 && !hasInitialized) {
      // If no current path, just mark as initialized
      setHasInitialized(true);
    }
  }, [currentPath, treeData, expandToPath, hasInitialized]);

  if (!isVisible) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Directory Tree</h3>
        <button
          className={styles.viewButton}
          onClick={fetchDirectoryStructure}
          disabled={isLoading}
          title="Refresh directory structure"
        >
          ↻
        </button>
      </div>

      <div className={styles.tree}>
        {isLoading ? (
          <div className={styles.loading}>Loading directories...</div>
        ) : treeData.length === 0 ? (
          <div className={styles.empty}>No directories found</div>
        ) : (
          treeData.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
}
