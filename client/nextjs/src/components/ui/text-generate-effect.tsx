"use client";
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  wordClassName,
  filter = true,
  duration = 0.25,
  staggerDelay = 0.035,
}: {
  words: string;
  className?: string;
  wordClassName?: string;
  filter?: boolean;
  duration?: number;
  staggerDelay?: number;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");
  useEffect(() => {
    animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: duration ? duration : 1,
        delay: stagger(staggerDelay),
      }
    );
  }, [animate, duration, filter, scope, staggerDelay]);

  const renderWords = () => {
    return (
      <motion.span ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className={cn("opacity-0", wordClassName)}
              style={{
                filter: filter ? "blur(10px)" : "none",
              }}
            >
              {word}{" "}
            </motion.span>
          );
        })}
      </motion.span>
    );
  };

  return (
    <span className={cn("text-sm leading-6 text-foreground", className)}>
      {renderWords()}
    </span>
  );
};
