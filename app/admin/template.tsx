'use client';
import { motion } from 'motion/react';
import { softSpring } from '@/components/admin/motion';

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
      {children}
    </motion.div>
  );
}
