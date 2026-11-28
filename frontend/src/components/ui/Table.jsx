import Spinner from "./Spinner";
import EmptyState from "./EmptyState";

// columns: [{ key, header, render?: (row) => node, className? }]
export default function Table({
  columns,
  rows,
  rowKey = "id",
  loading = false,
  emptyTitle = "Belum ada data",
  emptyDescription,
  emptyAction,
}) {
  if (loading) return <Spinner />;
  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-garis bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-garis bg-kertas text-redam">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`px-3 py-3 font-semibold sm:py-2 ${c.className || ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-garis">
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-3 sm:py-2 ${c.className || ""}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
