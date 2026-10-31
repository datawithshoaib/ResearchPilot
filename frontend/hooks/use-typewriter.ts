"use client";

import { useEffect, useState } from "react";

/** Types and deletes each phrase in turn. Pauses (returns "") when inactive. */
export function useTypewriter(phrases: string[], active: boolean) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!active || phrases.length === 0) return;

    let phrase = 0;
    let length = 0;
    let deleting = false;
    let timer: number;

    const tick = () => {
      const current = phrases[phrase];
      length += deleting ? -1 : 1;
      setText(current.slice(0, length));

      let delay = deleting ? 18 : 38 + Math.random() * 40;
      if (!deleting && length === current.length) {
        deleting = true;
        delay = 2200;
      } else if (deleting && length === 0) {
        deleting = false;
        phrase = (phrase + 1) % phrases.length;
        delay = 400;
      }
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 600);

    return () => window.clearTimeout(timer);
  }, [active, phrases]);

  return active ? text : "";
}
