import { useEffect, useState } from "react";
import { loadTimeline } from "../data/loadTimeline";
import timelineUrl from "../data/timeline.json?url";
import { COPY } from "./copy";

type Status = "loading" | "error" | "ready";

export function App() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let active = true;
    loadTimeline(window.fetch.bind(window), timelineUrl).then(
      () => {
        if (active) setStatus("ready");
      },
      (error: unknown) => {
        console.error(error);
        if (active) setStatus("error");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="h-dvh w-full">
      {status === "loading" && <p>{COPY.loading}</p>}
      {status === "error" && <p role="alert">{COPY.loadError}</p>}
    </div>
  );
}
