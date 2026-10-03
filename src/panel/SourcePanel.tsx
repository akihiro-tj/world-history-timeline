// 出典パネル（spec §5）。PC は年表の右、スマホは画面の下から出す。モーダルにはせず、年表は操作できるままにする
import { useEffect, useRef } from "react";
import { COPY } from "../app/copy";
import { ExternalLinkIcon } from "../app/icons";
import { formatPeriod } from "../timeline/format";
import type { PanelContent, PanelSection } from "./content";

export const PANEL_WIDTH = 360;
export const SHEET_HEIGHT_RATIO = 0.56;
// 取っ手をこれ以上動かしたら、広げる・閉じるとみなす（px）
const DRAG_THRESHOLD = 32;

const SECTION_LABELS: Record<PanelSection, string> = {
  period: COPY.sectionPeriod,
  monarch: COPY.sectionMonarch,
  leader: COPY.sectionLeader,
};

type Props = {
  content: PanelContent;
  layout: "side" | "sheet";
  onClose: () => void;
  // スマホで全画面に広げているか
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function SourcePanel({ content, layout, onClose, expanded, onExpandedChange }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dragStart = useRef<number | null>(null);

  // 開いたとき（中身が変わったとき）にパネルの名前へフォーカスを移す
  // biome-ignore lint/correctness/useExhaustiveDependencies: 中身が変わるたびにフォーカスを移し直す
  useEffect(() => {
    titleRef.current?.focus();
  }, [content]);

  // Esc で閉じる
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const placement =
    layout === "side"
      ? "shrink-0 border-l border-border"
      : "absolute inset-x-0 bottom-0 z-40 rounded-t-md border-t border-border";
  const size =
    layout === "side"
      ? { width: PANEL_WIDTH }
      : { height: expanded ? "100%" : `${SHEET_HEIGHT_RATIO * 100}%` };

  return (
    <aside
      aria-label={COPY.panelLabel}
      className={`flex min-h-0 flex-col bg-surface font-body text-body text-on-surface ${placement}`}
      style={size}
    >
      {layout === "sheet" && (
        // 取っ手: 上に引くと全画面、下に引くと（全画面なら元の高さに、そうでなければ）閉じる。押すと切り替える
        <div
          aria-hidden="true"
          className="flex shrink-0 cursor-grab touch-none justify-center pt-sm"
          onPointerDown={(event) => {
            dragStart.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const start = dragStart.current;
            dragStart.current = null;
            if (start === null) return;
            const moved = event.clientY - start;
            if (moved < -DRAG_THRESHOLD) onExpandedChange(true);
            else if (moved > DRAG_THRESHOLD) {
              if (expanded) onExpandedChange(false);
              else onClose();
            } else onExpandedChange(!expanded);
          }}
        >
          <span className="h-xs w-10 rounded-sm bg-border" />
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between gap-sm pt-sm pl-md">
        <h2 ref={titleRef} tabIndex={-1} className="font-title text-title outline-none">
          {content.name}
        </h2>
        <button
          type="button"
          aria-label={COPY.close}
          onClick={onClose}
          className="inline-flex min-h-tap min-w-tap items-center justify-center text-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          ×
        </button>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-md overflow-y-auto px-md pt-xs pb-md">
        {content.links.length > 0 && (
          <section>
            <h3 className="mb-xs font-heading text-heading text-muted">{COPY.sectionSources}</h3>
            <ul className="grid gap-xs">
              {content.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {link.label}
                    <ExternalLinkIcon />
                    <span className="sr-only">{COPY.newTab}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h3 className="mb-xs font-heading text-heading text-muted">
            {SECTION_LABELS[content.section]}
          </h3>
          <ul>
            {content.rows.map((row) => (
              <li key={row.id} className="border-b border-grid py-sm last:border-b-0">
                <div className="flex justify-between gap-sm tabular-nums">
                  <span>{formatPeriod(row.start, row.end)}</span>
                  {row.title !== null && <span className="text-muted">{row.title}</span>}
                </div>
                {row.notes.map((note) => (
                  <p
                    key={note}
                    className="mt-xs grid grid-cols-[auto_1fr] font-label text-label text-muted"
                  >
                    <span aria-hidden="true">{COPY.noteMark}</span>
                    <span>{note}</span>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
