import type { ShelfFile } from "../../../shared/types";
import { Close, Tray } from "./icons";

const api = window.island;

const size = (n: number) => (n === 0 ? "Folder" : n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Files kept on the notch: drag one out into any app, click to open, × to take it off. */
export function Shelf({ files }: { files: ShelfFile[] }) {
  if (!files.length)
    return (
      <div className="shelf-empty">
        <Tray size={26} />
        <p>Drag files onto the notch to keep them here,<br />then drag them out into any app.</p>
      </div>
    );
  return (
    <div className="shelf">
      {files.map((f) => (
        <div
          key={f.path}
          className="shelf__file"
          title={f.path}
          draggable
          onDragStart={(e) => { e.preventDefault(); api.shelfDrag(f.path); }}
          onDoubleClick={() => api.shelfOpen(f.path)}
        >
          {f.icon ? <img src={f.icon} alt="" draggable={false} /> : <span className="shelf__blank" />}
          <span className="shelf__name">{f.name}</span>
          <span className="shelf__size">{size(f.size)}</span>
          <button type="button" className="shelf__remove" aria-label={`Remove ${f.name}`} onClick={() => api.shelfRemove(f.path)}><Close /></button>
        </div>
      ))}
    </div>
  );
}
