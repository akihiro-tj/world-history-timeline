// 出典パネル（spec §5）。PC は年表の右、スマホは画面の下から出す。モーダルにはせず、年表は操作できるままにする
import { useCallback, useEffect, useRef, useState } from "react";
import { COPY } from "../app/copy";
import { CloseIcon, ExternalLinkIcon } from "../app/icons";
import { useMediaQuery } from "../app/useMediaQuery";
import { formatPeriod } from "../timeline/format";
import type { PanelContent, PanelSection } from "./content";
import { releaseVelocity, SHEET_HEIGHT_RATIO, settleSheet, sheetOffset } from "./sheet";

export const PANEL_WIDTH = 360;
// 引く操作とみなす指の移動量（px）。これより短ければタップ
const DRAG_START = 8;
// 収まるまでの時間（ms）
const SETTLE_MS = 250;

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

// 引いている途中の記録。offset は下へのずらし量（px）
type Drag = {
  startY: number;
  startOffset: number;
  height: number;
  dragging: boolean;
  samples: { y: number; t: number }[];
};

export function SourcePanel({ content, layout, onClose, expanded, onExpandedChange }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // 引いた直後のクリック（指を離した位置のリンクなど）を押したことにしない
  const suppressClick = useRef(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // 開いた直後は閉じた位置に置き、次のフレームで動かして下から滑り上げる
  const [entered, setEntered] = useState(layout === "side" || reducedMotion);
  const [closing, setClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const sheet = layout === "sheet";

  // 開いたとき（中身が変わったとき）にパネルの名前へフォーカスを移す
  // biome-ignore lint/correctness/useExhaustiveDependencies: 中身が変わるたびにフォーカスを移し直す
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [content]);

  useEffect(() => {
    if (entered) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [entered]);

  // 閉じる。シートは下へ滑らせてから閉じる
  const requestClose = useCallback(() => {
    if (!sheet || reducedMotion) onClose();
    else setClosing(true);
  }, [sheet, reducedMotion, onClose]);

  // Esc で閉じる
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  // シートのどこを引いても動かす。全画面で中身をスクロールできるときはスクロールを優先する
  const start = (y: number) => {
    const height = sheetRef.current?.clientHeight ?? 0;
    drag.current = {
      startY: y,
      startOffset: sheetOffset(expanded ? "full" : "half", height),
      height,
      dragging: false,
      samples: [{ y, t: performance.now() }],
    };
  };
  // 引く操作として扱ったら true（呼び出し側でスクロールを止める）
  const move = (y: number): boolean => {
    const d = drag.current;
    if (!d) return false;
    const dy = y - d.startY;
    if (!d.dragging) {
      if (Math.abs(dy) < DRAG_START) return false;
      const scrolled = (bodyRef.current?.scrollTop ?? 0) > 0;
      if (expanded && (dy < 0 || scrolled)) {
        drag.current = null;
        return false;
      }
      d.dragging = true;
      // 引き始めに選んでいた文字を外す（選んだ文字の上を引くと、ブラウザのドラッグになるため）
      window.getSelection()?.removeAllRanges();
    }
    d.samples = [...d.samples, { y, t: performance.now() }].slice(-20);
    setDragOffset(Math.min(Math.max(d.startOffset + dy, 0), d.height));
    return true;
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.dragging) return;
    suppressClick.current = true;
    const last = d.samples[d.samples.length - 1];
    const velocity = releaseVelocity(d.samples, performance.now());
    const offset = Math.min(
      Math.max(d.startOffset + ((last?.y ?? d.startY) - d.startY), 0),
      d.height,
    );
    const state = settleSheet(offset, velocity, d.height);
    setDragOffset(null);
    if (state === "closed") requestClose();
    else onExpandedChange(state === "full");
  };

  // タッチでは、引いているあいだ中身のスクロールを止めるため、passive でないリスナーを使う。
  // 毎回の描画の start・move・end を使うので、依存配列は付けない
  useEffect(() => {
    const element = sheetRef.current;
    if (!sheet || !element) return;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (event.touches.length === 1 && touch) start(touch.clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch && move(touch.clientY)) event.preventDefault();
    };
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
    };
  });

  const state = closing || !entered ? "closed" : expanded ? "full" : "half";
  const transform =
    dragOffset !== null
      ? `translateY(${dragOffset}px)`
      : `translateY(${state === "full" ? 0 : state === "half" ? (1 - SHEET_HEIGHT_RATIO) * 100 : 100}%)`;
  const placement = sheet
    ? "absolute inset-x-0 bottom-0 z-40 h-full touch-pan-y rounded-t-lg shadow-sheet"
    : "shrink-0 border-l border-border";

  return (
    <aside
      ref={sheetRef}
      aria-label={COPY.panelLabel}
      className={`flex min-h-0 flex-col bg-surface font-body text-body text-on-surface ${placement} ${dragOffset !== null ? "select-none" : ""}`}
      style={
        sheet
          ? {
              transform,
              transition:
                dragOffset !== null || reducedMotion
                  ? "none"
                  : `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0, 0, 1)`,
            }
          : { width: PANEL_WIDTH }
      }
      onTransitionEnd={(event) => {
        if (closing && event.target === event.currentTarget) onClose();
      }}
      // マウスでもシートを引ける（タッチは上の touch のリスナーで扱う）
      onPointerDown={(event) => {
        if (sheet && event.pointerType === "mouse") start(event.clientY);
      }}
      onPointerMove={(event) => {
        if (sheet && event.pointerType === "mouse" && move(event.clientY)) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerUp={(event) => {
        if (sheet && event.pointerType === "mouse") end();
      }}
      onPointerCancel={(event) => {
        if (sheet && event.pointerType === "mouse") end();
      }}
      onDragStart={(event) => {
        if (sheet) event.preventDefault();
      }}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {sheet && (
        // 取っ手。シート全体を引けることの目印
        <div aria-hidden="true" className="flex shrink-0 justify-center pt-sm">
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
          onClick={requestClose}
          className="group inline-flex min-h-tap min-w-tap items-center justify-center focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface-subtle text-on-surface">
            <CloseIcon />
          </span>
        </button>
      </div>
      <div
        ref={bodyRef}
        // 半分の高さのときは中身をスクロールさせず、続きは広げて読む
        className={`grid min-h-0 flex-1 content-start gap-md px-md pt-xs pb-md ${!sheet || expanded ? "overflow-y-auto" : "overflow-hidden"}`}
      >
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
      </div>
    </aside>
  );
}
