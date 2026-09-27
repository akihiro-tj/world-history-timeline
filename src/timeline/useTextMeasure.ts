// フォントを読み込んだ後に、棒の文字と同じフォントで文字列の幅を測る関数を返す
import { type RefObject, useEffect, useState } from "react";

export type Measure = (text: string) => number;

export function useTextMeasure(probe: RefObject<HTMLElement | null>): Measure | null {
  const [measure, setMeasure] = useState<Measure | null>(null);

  useEffect(() => {
    let active = true;
    document.fonts.ready.then(() => {
      const element = probe.current;
      if (!active || !element) return;
      const style = getComputedStyle(element);
      const context = document.createElement("canvas").getContext("2d");
      if (!context) {
        // canvas が使えない環境では、全角 1 文字 = フォントサイズとして見積もる
        const size = Number.parseFloat(style.fontSize);
        setMeasure(() => (text: string) => text.length * size);
        return;
      }
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      setMeasure(() => (text: string) => context.measureText(text).width);
    });
    return () => {
      active = false;
    };
  }, [probe]);

  return measure;
}
