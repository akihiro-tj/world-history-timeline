import { useEffect, useState } from "react";
import { loadTimeline } from "../data/loadTimeline";
import type { TimelineData } from "../data/timeline";
import timelineUrl from "../data/timeline.json?url";
import type { Orientation } from "../timeline/layout";
import { initialOrientation } from "../timeline/scroll";
import type { Subject } from "../timeline/spans";
import { Timeline } from "../timeline/Timeline";
import { COPY } from "./copy";
import { HorizontalIcon, VerticalIcon } from "./icons";
import { SubjectSelect } from "./SubjectSelect";
import { ToggleGroup } from "./ToggleGroup";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: TimelineData };

const SUBJECTS = [
  { value: "dynasty", label: COPY.subjectDynasty },
  { value: "reign", label: COPY.subjectReign },
] as const;

const ORIENTATIONS = [
  { value: "vertical", label: COPY.orientationVertical, icon: <VerticalIcon /> },
  { value: "horizontal", label: COPY.orientationHorizontal, icon: <HorizontalIcon /> },
] as const;

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [subject, setSubject] = useState<Subject>("dynasty");
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

  return (
    <div className="flex h-dvh flex-col bg-surface font-body text-body text-on-surface">
      <header className="flex items-center justify-between gap-sm border-b border-border p-sm">
        <SubjectSelect
          label={COPY.subjectLabel}
          options={SUBJECTS}
          value={subject}
          onChange={setSubject}
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
        {state.status === "ready" && (
          <Timeline data={state.data} subject={subject} orientation={orientation} />
        )}
      </main>
    </div>
  );
}
