import { useEffect, useRef, useCallback } from 'react';

export default function RecordTable({
  fields,
  records,
  loading,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
}) {
  const sentinelRef = useRef(null);

  const handleIntersect = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersect, { threshold: 0.1 });
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [handleIntersect]);

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {fields.map((f) => (
              <th key={f.name}>{f.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec.Id}>
              {fields.map((f) => (
                <td key={f.name}>{formatValue(rec[f.name])}</td>
              ))}
              <td className="actions-cell">
                <button onClick={() => onEdit(rec)}>Edit</button>
                <button className="danger" onClick={() => onDelete(rec)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {records.length === 0 && !loading && <p className="empty-state">No records found.</p>}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <p className="loading-state">Loading records…</p>}
      {!hasMore && records.length > 0 && (
        <p className="end-state">All records loaded.</p>
      )}
    </div>
  );
}

function formatValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
