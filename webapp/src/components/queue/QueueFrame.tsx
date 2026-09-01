import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./queue.module.css";

export function QueueFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <Link href="/queue" className={styles.brand}>
          <span>IV</span>
          <div><strong>QueueMaster</strong><small>by Fourth Canal</small></div>
        </Link>
        <Link href="/" className={styles.backLink}>Fourth Canal home</Link>
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
