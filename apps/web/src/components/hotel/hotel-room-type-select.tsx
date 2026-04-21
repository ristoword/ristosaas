"use client";

import {
  ROOM_TYPE_OPTIONS,
  otherRoomTypeInputValue,
  storedRoomTypeToSelectValue,
  type RoomTypeSelectValue,
} from "@/modules/hotel/domain/room-type";

const inputCls = "rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink";

type Props = {
  id?: string;
  labelId?: string;
  value: string;
  onChange: (roomType: string) => void;
  /** classi aggiuntive per il select (es. sm:col-span-2) */
  selectClassName?: string;
};

export function HotelRoomTypeSelect({ id = "hotel-room-type", labelId, value, onChange, selectClassName = "" }: Props) {
  return (
    <div className="grid gap-2">
      <label className="text-xs font-semibold text-rw-muted" htmlFor={id} id={labelId}>
        Tipo camera
      </label>
      <select
        id={id}
        className={`${inputCls} ${selectClassName}`.trim()}
        value={storedRoomTypeToSelectValue(value)}
        onChange={(e) => {
          const v = e.target.value as RoomTypeSelectValue;
          if (v === "OTHER") {
            onChange(otherRoomTypeInputValue(value) || "OTHER");
          } else {
            onChange(v);
          }
        }}
      >
        {ROOM_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {storedRoomTypeToSelectValue(value) === "OTHER" ? (
        <input
          className={inputCls}
          placeholder="Nome tipologia personalizzata"
          value={otherRoomTypeInputValue(value)}
          onChange={(e) => {
            const text = e.target.value;
            onChange(text.trim() || "OTHER");
          }}
        />
      ) : null}
    </div>
  );
}
