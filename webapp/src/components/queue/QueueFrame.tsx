import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./queue.module.css";

export function QueueFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <Link href="/queue" className={styles.brand}>
          <GraduationCap size={28} aria-hidden="true" />
          <strong>QueueMaster</strong>
        </Link>
        <nav className={styles.frameNav}>
          <Link href="/queue">Home</Link>
          <Link href="/legal">Privacy &amp; terms</Link>
        </nav>
      </header>
      <div className={wide ? styles.wide : styles.container}>{children}</div>
    </main>
  );
}

export function QueueLoading({ label = "Loading queue…" }: { label?: string }) {
  return <div className={styles.notice}>{label}</div>;
}

export function QueueError({ message }: { message: string }) {
  return <div className={`${styles.notice} ${styles.error}`} role="alert">{message}</div>;
}
