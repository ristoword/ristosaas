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
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Nessun dato",
  stickyHeader,
  onRowClick,
  selectedKey,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-rw-line">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className={stickyHeader ? "sticky top-0 z-10" : undefined}>
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
            data.map((row) => {
              const key = keyExtractor(row);
              return (
              <tr
                key={key}
                className={cn(
                  "border-b border-rw-line/50 transition",
                  onRowClick && "cursor-pointer hover:bg-rw-surfaceAlt/50",
                  selectedKey === key && "bg-rw-accent/10",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-rw-soft", col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
