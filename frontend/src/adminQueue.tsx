import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getAdminQuestions, SessionExpiredError } from "./adminAPI";
import type { AdminQueue, AdminQuestionPage } from "./adminAPI";

export const CATEGORY_LABELS: Record<string, string> = {
  campus: "UCF/Campus",
};

export function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// loads one page of an admin queue and lets the page remove cards as they're handled
export function useAdminQueue(queue: AdminQueue) {
  const navigate = useNavigate();

  const [data, setData] = useState<AdminQuestionPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await getAdminQuestions(queue, page);

        if (ignore) return;

        // the last card on a later page was handled, so step back a page
        if (result.results.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }

        setData(result);
      } catch (error) {
        if (ignore) return;

        if (error instanceof SessionExpiredError) {
          navigate("/login", { replace: true });
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : "Unable to load questions.",
        );
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [queue, page, reloadCount, navigate]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  // take a card out without reloading the whole page
  function remove(questionId: string) {
    const remaining = (data?.results ?? []).filter((item) => item._id !== questionId);

    setData((current) =>
      current
        ? { ...current, results: remaining, total: Math.max(0, current.total - 1) }
        : current,
    );

    // fetch the next batch once this page is cleared
    if (remaining.length === 0) reload();
  }

  return { data, isLoading, loadError, page, setPage, reload, remove };
}

type QueuePagesProps = {
  label: string;
  data: AdminQuestionPage | null;
  page: number;
  isLoading: boolean;
  setPage: (page: number) => void;
};

export function QueuePages({ label, data, page, isLoading, setPage }: QueuePagesProps) {
  if (!data || data.totalPages <= 1) return null;

  return (
    <nav className="market-pagination" aria-label={label}>
      <button
        type="button"
        disabled={page <= 1 || isLoading}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>

      <span>
        Page {data.page} of {data.totalPages}
      </span>

      <button
        type="button"
        disabled={page >= data.totalPages || isLoading}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

type QueueStateProps = {
  data: AdminQuestionPage | null;
  isLoading: boolean;
  loadError: string;
  reload: () => void;
  loadingText: string;
  emptyText: string;
};

// loading, error, and "all caught up" messages shared by both queues
export function QueueState({
  data,
  isLoading,
  loadError,
  reload,
  loadingText,
  emptyText,
}: QueueStateProps) {
  if (loadError) {
    return (
      <div className="market-empty">
        <h3>Couldn't load questions</h3>
        <p role="alert">{loadError}</p>
        <button className="market-search-button" type="button" onClick={reload}>
          Retry
        </button>
      </div>
    );
  }

  if (isLoading && !data) {
    return <p className="admin-loading">{loadingText}</p>;
  }

  if (data && data.results.length === 0 && !isLoading) {
    return (
      <div className="market-empty">
        <h3>All caught up</h3>
        <p>{emptyText}</p>
        <button className="market-search-button" type="button" onClick={reload}>
          Check again
        </button>
      </div>
    );
  }

  return null;
}
