"use client";;
import { cn } from "@/lib/utils";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const SearchIcon = forwardRef((
 {
  onMouseEnter,
  onMouseLeave,
  className,
  size = 24,
  duration = 1,
  isAnimated = true,
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

 const handleEnter = useCallback((e) => {
  if (!isAnimated || reduced) return;
  if (!isControlled.current) controls.start("animate");
  else onMouseEnter?.(e);
 }, [controls, reduced, isAnimated, onMouseEnter]);

 const handleLeave = useCallback((e) => {
  if (!isControlled.current) controls.start("normal");
  else onMouseLeave?.(e);
 }, [controls, onMouseLeave]);

 const lensVariants = {
  normal: { x: 0, y: 0, rotate: 0, opacity: 1 },
  animate: {
   x: [0, 2, -2, 1, 0],
   y: [0, -1, 2, -1, 0],
   rotate: [0, 6, -6, 4, 0],
   transition: {
    duration: 1.2 * duration,
    ease: "easeInOut",
   },
  },
 };

 return (
  <motion.div
   className={cn("inline-flex items-center justify-center", className)}
   onMouseEnter={handleEnter}
   onMouseLeave={handleLeave}
   {...props}>
   <motion.svg
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
    initial="normal">
    <motion.g variants={lensVariants}>
     <motion.circle cx="11" cy="11" r="8" />
     <path d="m21 21-4.34-4.34" />
    </motion.g>
   </motion.svg>
  </motion.div>
 );
});

SearchIcon.displayName = "SearchIcon";
export { SearchIcon };
