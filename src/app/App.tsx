import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadTimeline } from "../data/loadTimeline";
import type { TimelineData } from "../data/timeline";
import timelineUrl from "../data/timeline.json?url";
import { panelContent } from "../panel/content";
import { SourcePanel } from "../panel/SourcePanel";
import { isSelected, keepSelection, laneIdOf, type Selection, spanKey } from "../panel/selection";
import { SHEET_HEIGHT_RATIO } from "../panel/sheet";
import { type Orientation, timeRange } from "../timeline/layout";
import type { Row, Span } from "../timeline/spans";
import { rowsForView, type View, valueToView, viewToValue } from "../timeline/spans";
import { Timeline } from "../timeline/Timeline";
import { COPY } from "./copy";
import { HorizontalIcon, VerticalIcon } from "./icons";
import { ToggleGroup } from "./ToggleGroup";
import { useMediaQuery } from "./useMediaQuery";
import { type ViewGroup, ViewSelect } from "./ViewSelect";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: TimelineData };

const SUBJECT_GROUP: ViewGroup = {
  label: COPY.groupSubject,
  options: [
    { value: viewToValue({ kind: "subject", subject: "regime" }), label: COPY.subjectRegime },
    { value: viewToValue({ kind: "subject", subject: "monarch" }), label: COPY.subjectMonarch },
    { value: viewToValue({ kind: "subject", subject: "leader" }), label: COPY.subjectLeader },
    {
      value: viewToValue({ kind: "subject", subject: "government" }),
      label: COPY.subjectGovernment,
    },
  ],
};

// 国・地域の表示の行の名前は、主題の選択肢と同じ文言にする（spec §5）
const ROW_NAMES = {
  regime: COPY.subjectRegime,
  government: COPY.subjectGovernment,
  monarch: COPY.subjectMonarch,
  leader: COPY.subjectLeader,
} as const;

const ORIENTATIONS = [
  { value: "vertical", label: COPY.orientationVertical, icon: <VerticalIcon /> },
  { value: "horizontal", label: COPY.orientationHorizontal, icon: <HorizontalIcon /> },
] as const;

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [view, setView] = useState<View>({ kind: "subject", subject: "regime" });
  const [orientation, setOrientation] = useState<Orientation>("horizontal");

  useEffect(() => {
    let active = true;
    loadTimeline(window.fetch.bind(window), timelineUrl).then(
      (data) => {
        if (active) setState({ status: "ready", data });
      },
      (error: unknown) => {
        console.error(error);
        if (active) setState({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const data = state.status === "ready" ? state.data : null;
  // 現在まで続く期間の終わりに使う。開いている間に年が変わっても描き直さない
  const [currentYear] = useState(() => new Date().getFullYear());
  const range = useMemo(() => (data ? timeRange(data, currentYear) : null), [data, currentYear]);
  // 行を作り直すと Timeline が中央の年に合わせ直すので、表示が変わったときだけ作る
  const rows = useMemo(() => (data ? rowsForView(data, view, ROW_NAMES) : null), [data, view]);
  // 幅 768px 以上は右にパネル、未満は下からパネル（spec §5）
  const wide = useMediaQuery("(min-width: 768px)");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState(false);
  // 閉じたときにフォーカスを戻す、選んだ棒のボタン
  const trigger = useRef<HTMLElement | null>(null);

  // 表示を切り替えた先に選んだ項目がなければ閉じる
  useEffect(() => {
    if (rows) setSelection((current) => keepSelection(current, view, rows));
  }, [rows, view]);

  // 閉じたら、次に開くときは元の高さから
  useEffect(() => {
    if (selection === null) setExpanded(false);
  }, [selection]);

  const content = useMemo(
    () => (data && selection ? panelContent(data, selection) : null),
    [data, selection],
  );

  const handleSelect = useCallback(
    (row: Row, span: Span, element: HTMLElement) => {
      trigger.current = element;
      setSelection({ laneId: laneIdOf(view, row), key: spanKey(span) });
    },
    [view],
  );

  const handleClose = useCallback(() => {
    setSelection(null);
    if (trigger.current?.isConnected) trigger.current.focus();
  }, []);

  const selected = useCallback(
    (row: Row, span: Span) => isSelected(selection, laneIdOf(view, row), span),
    [selection, view],
  );
  // 読み込むまでは国・地域がわからないので、主題の群だけを出す
  const groups = useMemo<ViewGroup[]>(
    () =>
      data
        ? [
            SUBJECT_GROUP,
            {
              label: COPY.groupLane,
              options: data.lanes.map((lane) => ({
                value: viewToValue({ kind: "lane", laneId: lane.id }),
                label: lane.name,
              })),
            },
          ]
        : [SUBJECT_GROUP],
    [data],
  );

  function handleViewChange(value: string) {
    const next = valueToView(value, data ? data.lanes.map((lane) => lane.id) : []);
    if (next) setView(next);
  }

  return (
    <div className="flex h-dvh flex-col bg-surface font-body text-body text-on-surface">
      <header className="flex items-center justify-between gap-sm border-b border-border p-sm">
        <ViewSelect
          label={COPY.viewLabel}
          groups={groups}
          value={viewToValue(view)}
          onChange={handleViewChange}
        />
        <ToggleGroup
          label={COPY.orientationLabel}
          options={ORIENTATIONS}
          value={orientation}
          onChange={setOrientation}
        />
      </header>
      <main className="relative flex min-h-0 flex-1 overflow-clip">
        <div className="min-w-0 flex-1">
          {state.status === "loading" && <p className="p-md text-muted">{COPY.loading}</p>}
          {state.status === "error" && (
            <p role="alert" className="m-md rounded-sm bg-error-surface p-sm text-on-error-surface">
              {COPY.loadError}
            </p>
          )}
          {rows && (
            <Timeline
              rows={rows}
              range={range}
              orientation={orientation}
              currentYear={currentYear}
              isSelected={selected}
              onSelect={handleSelect}
              revealKey={selection ? `${selection.laneId}|${selection.key}` : null}
              visibleRatio={wide || !content ? 1 : expanded ? 0 : 1 - SHEET_HEIGHT_RATIO}
              // 年表のいちばん下の棒も、シートの上の見える範囲の真ん中まで持ち上げられるだけの余白
              endSpaceRatio={wide || !content ? 0 : (1 + SHEET_HEIGHT_RATIO) / 2}
              revealCentered={!wide}
            />
          )}
        </div>
        {content && (
          <SourcePanel
            content={content}
            layout={wide ? "side" : "sheet"}
            onClose={handleClose}
            expanded={expanded}
            onExpandedChange={setExpanded}
          />
        )}
      </main>
    </div>
  );
}
