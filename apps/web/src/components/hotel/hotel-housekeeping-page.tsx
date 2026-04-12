"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { housekeepingTasks, hotelRooms } from "@/modules/hotel/domain/mock-data";

const taskTone = {
  todo: "warn",
  in_progress: "info",
  done: "success",
} as const;

export function HotelHousekeepingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Housekeeping" subtitle="Pulizie, ispezioni e camere bloccate per manutenzione.">
        <Chip label="Task aperti" value={housekeepingTasks.filter((item) => item.status !== "done").length} tone="warn" />
      </PageHeader>

      <Card title="Coda housekeeping" description="Vista operativa per camere da pulire, pronte o in manutenzione.">
        <DataTable
          columns={[
            {
              key: "roomId",
              header: "Camera",
              render: (row) => {
                const room = hotelRooms.find((item) => item.id === row.roomId);
                return <span className="font-semibold text-rw-ink">{room?.code || row.roomId}</span>;
              },
            },
            { key: "assignedTo", header: "Assegnato a", render: (row) => <span className="text-rw-ink">{row.assignedTo}</span> },
            { key: "scheduledFor", header: "Data", render: (row) => <span className="text-rw-soft">{row.scheduledFor}</span> },
            { key: "status", header: "Stato", render: (row) => <Chip label={row.status.replace("_", " ")} tone={taskTone[row.status]} /> },
            { key: "inspected", header: "Ispezione", render: (row) => <span className="text-rw-soft">{row.inspected ? "OK" : "Da verificare"}</span> },
          ]}
          data={housekeepingTasks}
          keyExtractor={(row) => row.id}
        />
      </Card>
    </div>
  );
}
