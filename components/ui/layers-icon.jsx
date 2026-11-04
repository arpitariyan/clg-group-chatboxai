"use client";;
import { cn } from "@/lib/utils";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const LayersIcon = forwardRef((
 {
  onMouseEnter,
  onMouseLeave,
  className,
  size = 24,
  duration = 0.2,
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

 const iconVariants = {
  normal: { scale: 1 },
  animate: {
   scale: 1.05,
   transition: {
    duration,
    ease: "easeOut",
   },
  },
 };

 const layerVariants = {
  normal: { y: 0, opacity: 1 },
  animate: (i) => ({
   y: -(i + 1) * 4,
   opacity: 1,
   transition: {
    duration,
    ease: "easeOut",
    delay: i * 0.07,
   },
  }),
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
    initial="normal"
    animate={controls}
    variants={iconVariants}>
    <motion.path
     d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
     variants={layerVariants}
     custom={0} />
    <motion.path
     d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"
     variants={layerVariants}
     custom={1} />
    <motion.path
     d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
     variants={layerVariants}
     custom={2} />
   </motion.svg>
  </motion.div>
 );
});

LayersIcon.displayName = "LayersIcon";
export { LayersIcon };
