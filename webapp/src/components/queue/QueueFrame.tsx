import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./queue.module.css";
import { QueueLobbyNav } from "./QueueLobbyNav";

export function QueueFrame({ children, wide = false, slug }: { children: ReactNode; wide?: boolean; slug?: string }) {
  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <Link href="/" className={styles.brand}>
          <GraduationCap size={28} aria-hidden="true" />
          <strong>QueueMaster</strong>
        </Link>
        <nav className={styles.frameNav}>
          <Link href="/queue/dashboard">Dashboard</Link>
          <Link href="/queue/privacy">Privacy</Link>
          <form action="/auth/signout" method="post"><button className="text-sm font-semibold text-slate-600">Sign Out</button></form>
        </nav>
      </header>
      {slug ? <QueueLobbyNav slug={slug} /> : null}
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
