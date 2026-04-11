import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
};

export function DataTable<T>({ columns, data, keyExtractor, emptyMessage = "Nessun dato" }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-rw-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rw-line bg-rw-surfaceAlt">
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-rw-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="border-b border-rw-line/50 transition hover:bg-rw-surfaceAlt/50">
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-rw-soft", col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
