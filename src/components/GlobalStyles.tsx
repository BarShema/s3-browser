export function GlobalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --white: #ffffff;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-900: #111827;
          --blue-500: #3b82f6;
          --blue-600: #2563eb;
          --blue-700: #1d4ed8;
          --indigo-600: #4f46e5;
          --indigo-700: #4338ca;
          --red-50: #fef2f2;
          --red-100: #fee2e2;
          --red-200: #fecaca;
          --red-600: #dc2626;
          --green-600: #16a34a;
          --yellow-600: #ca8a04;
        }
        
        body {
          background: var(--theme-bg-gradient);
          color: var(--gray-900);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .btn-primary {
          background: linear-gradient(to right, var(--blue-600), var(--indigo-600));
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(to right, var(--blue-700), var(--indigo-700));
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        select {
          background: var(--theme-bg-primary);
          color: var(--theme-text-primary);
          border-radius: 6px;
          font-size: 14px;
          padding: 8px 12px;
        }

        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          padding-left: 2.75rem;
          border: 1px solid var(--gray-300);
          border-radius: 0.75rem;
          font-size: 1rem;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          backdrop-filter: blur(8px);
          transition: all 0.2s;
        }

        .input:focus {
          outline: none;
          border-color: var(--blue-500);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .input::placeholder {
          color: var(--gray-400);
        }

        .card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .flex {
          display: flex;
        }

        .flex-col {
          flex-direction: column;
        }

        .items-center {
          align-items: center;
        }

        .justify-center {
          justify-content: center;
        }

        .justify-between {
          justify-content: space-between;
        }

        .space-x {
          display: flex;
          gap: 0.5rem;
        }

        .space-y {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .hidden {
          display: none;
        }

        .text-center {
          text-align: center;
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .transition {
          transition: all 0.2s;
        }

        .group:hover .group-hover-opacity-100 {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .container {
            padding: 0 0.5rem;
          }
        }
      `,
      }}
    />
  );
}
