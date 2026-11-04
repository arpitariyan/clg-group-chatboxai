"use client";

import { cn } from "@/lib/utils";
import {
 LazyMotion,
 domMin,
 m,
 useAnimation,
 useReducedMotion,
} from "motion/react";
import {
 forwardRef,
 useCallback,
 useImperativeHandle,
 useRef,
} from "react";

const MessageCirclePlusIcon = forwardRef(
 (
  {
   onMouseEnter,
   onMouseLeave,
   className,
   size = 24,
   duration = 1,
   isAnimated = true,
   color,
   ...props
  },
  ref,
 ) => {
  const controls = useAnimation();
  const reduced = useReducedMotion();
  const isControlled = useRef(false);

  useImperativeHandle(ref, () => {
   isControlled.current = true;
   return {
    startAnimation: () =>
     reduced ? controls.start("normal") : controls.start("animate"),
    stopAnimation: () => controls.start("normal"),
   };
  });

  const handleEnter = useCallback(
   (e) => {
    if (!isAnimated || reduced) return;
    if (!isControlled.current) controls.start("animate");
    else onMouseEnter?.(e);
   },
   [controls, reduced, isAnimated, onMouseEnter],
  );

  const handleLeave = useCallback(
   (e) => {
    if (!isControlled.current) {
     controls.start("normal");
    } else {
     onMouseLeave?.(e);
    }
   },
   [controls, onMouseLeave],
  );

  const bubbleVariants = {
   normal: { scale: 1, opacity: 1 },
   animate: {
    scale: [0.3, 1.05, 1],
    opacity: [0, 1, 1],
    transition: {
     duration: 0.55 * duration,
     times: [0, 0.7, 1],
     ease: [0.34, 1.4, 0.64, 1],
    },
   },
  };

  const plusVariants = {
   normal: { scale: 1, opacity: 1 },
   animate: {
    scale: [0.3, 1.2, 0.94, 1],
    opacity: [0, 1, 1, 1],
    transition: {
     duration: 0.55 * duration,
     delay: 0.26 * duration,
     ease: [0.34, 1.4, 0.64, 1],
    },
   },
  };

  return (
   <LazyMotion features={domMin} strict>
    <m.div
     className={cn("inline-flex items-center justify-center", className)}
     onMouseEnter={handleEnter}
     onMouseLeave={handleLeave}
     {...props}
     style={{ color, ...props.style }}
    >
     <m.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={controls}
      initial="normal"
     >
      <m.path
       d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
       variants={bubbleVariants}
       style={{ transformBox: "view-box", originX: "4px", originY: "20px" }}
      />
      <m.path
       d="M8 12h8"
       variants={plusVariants}
       style={{ transformBox: "view-box", originX: "12px", originY: "12px" }}
      />
      <m.path
       d="M12 8v8"
       variants={plusVariants}
       style={{ transformBox: "view-box", originX: "12px", originY: "12px" }}
      />
     </m.svg>
    </m.div>
   </LazyMotion>
  );
 },
);

MessageCirclePlusIcon.displayName = "MessageCirclePlusIcon";
export { MessageCirclePlusIcon };
