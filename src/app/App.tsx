import { useEffect, useMemo, useState } from "react";
import { loadTimeline } from "../data/loadTimeline";
import type { TimelineData } from "../data/timeline";
import timelineUrl from "../data/timeline.json?url";
import { type Orientation, timeRange } from "../timeline/layout";
import { initialOrientation } from "../timeline/scroll";
import { rowsForView, type View, valueToView, viewToValue } from "../timeline/spans";
import { Timeline } from "../timeline/Timeline";
import { COPY } from "./copy";
import { HorizontalIcon, VerticalIcon } from "./icons";
import { ToggleGroup } from "./ToggleGroup";
import { type ViewGroup, ViewSelect } from "./ViewSelect";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: TimelineData };

const SUBJECT_GROUP: ViewGroup = {
  label: COPY.groupSubject,
  options: [
    { value: viewToValue({ kind: "subject", subject: "dynasty" }), label: COPY.subjectDynasty },
    { value: viewToValue({ kind: "subject", subject: "reign" }), label: COPY.subjectReign },
  ],
};

// 国・地域の表示の行の名前は、主題の選択肢と同じ文言にする（spec §5）
const ROW_NAMES = { dynasty: COPY.subjectDynasty, reign: COPY.subjectReign } as const;

const ORIENTATIONS = [
  { value: "vertical", label: COPY.orientationVertical, icon: <VerticalIcon /> },
  { value: "horizontal", label: COPY.orientationHorizontal, icon: <HorizontalIcon /> },
] as const;

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [view, setView] = useState<View>({ kind: "subject", subject: "dynasty" });
  const [orientation, setOrientation] = useState<Orientation>(() =>
    initialOrientation(window.innerWidth, window.innerHeight),
  );

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
  const range = useMemo(() => (data ? timeRange(data) : null), [data]);
  // 行を作り直すと Timeline が中央の年に合わせ直すので、表示が変わったときだけ作る
  const rows = useMemo(() => (data ? rowsForView(data, view, ROW_NAMES) : null), [data, view]);
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
      <main className="min-h-0 flex-1">
        {state.status === "loading" && <p className="p-md text-muted">{COPY.loading}</p>}
        {state.status === "error" && (
          <p role="alert" className="m-md rounded-sm bg-error-surface p-sm text-on-error-surface">
            {COPY.loadError}
          </p>
        )}
        {rows && <Timeline rows={rows} range={range} orientation={orientation} />}
      </main>
    </div>
  );
}
