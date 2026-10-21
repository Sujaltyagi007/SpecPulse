'use client';
import React, { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform, type HTMLMotionProps, type Transition } from 'motion/react';

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 };
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 26 };

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
};

export function Stagger({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div className={className} style={style} variants={listVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, style, lift = false }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; lift?: boolean }) {
  return (
    <motion.div className={className} style={style} variants={itemVariants} whileHover={lift ? { y: -3, transition: spring } : undefined}>
      {children}
    </motion.div>
  );
}

export function MotionRow({ index = 0, children, ...rest }: HTMLMotionProps<'tr'> & { index?: number }) {
  return (
    <motion.tr layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }} transition={{ ...softSpring, delay: Math.min(index, 12) * 0.03 }} {...rest}    >
      {children}
    </motion.tr>
  );
}

export function AnimatedNumber({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString('en-US'));
  useEffect(() => {
    const controls = animate(mv, value, { type: 'spring', stiffness: 90, damping: 20 });
    return () => controls.stop();
  }, [mv, value]);
  return (
    <motion.span className={className} style={style}>
      {rounded}
    </motion.span>
  );
}

export const MotionButton = React.forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(function MotionButton(props, ref) {
  return <motion.button ref={ref} whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }} transition={spring} {...props} />;
});

export function FadeIn({ children, delay = 0, className, style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div className={className} style={style} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring, delay }}>
      {children}
    </motion.div>
  );
}
