"use client";

import styles from "./paginationControls.module.css";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: PaginationControlsProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageJump = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const page = parseInt(formData.get("page") as string);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        Showing {startItem}-{endItem} of {totalItems} items
      </div>

      <div className={styles.controls}>
        <div className={styles.pagination}>
          <div>
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className={styles.button}
            >
              First
            </button>

            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.button}
            >
              Previous
            </button>
          </div>

          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.button}
            >
              Next
            </button>

            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={styles.button}
            >
              Last
            </button>
          </div>
        </div>

        <form onSubmit={handlePageJump} className={styles.jumpTo}>
          <label htmlFor="jumpPage">Go to page:</label>
          <input
            id="jumpPage"
            name="page"
            type="number"
            min="1"
            max={totalPages}
            defaultValue={currentPage}
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Go
          </button>
        </form>

        <div className={styles.itemsPerPage}>
          <label htmlFor="itemsPerPage">Items per page:</label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
            className={styles.select}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
}
