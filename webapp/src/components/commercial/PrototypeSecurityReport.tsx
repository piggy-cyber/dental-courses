"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import styles from "./CommercialSite.module.css";

export function PrototypeSecurityReport() {
  const [sent, setSent] = useState(false);
  return (
    <section className={styles.panel}>
      {sent ? (
        <div className={styles.success} role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <strong>Prototype success state tested.</strong>
          <p>No report or contact information was transmitted.</p>
          <button className={styles.buttonSecondary} type="button" onClick={() => setSent(false)}>Reset form</button>
        </div>
      ) : (
        <form className={styles.formStack} onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}>
          <label className={styles.field}>Contact email<input name="email" type="email" autoComplete="email" required /></label>
          <label className={styles.field}>Issue summary<input name="summary" required maxLength={160} /></label>
          <label className={styles.field}>Security detail<textarea name="detail" required minLength={20} maxLength={4000} placeholder="Use synthetic, non-sensitive details in this prototype." /></label>
          <p className={styles.compatibilityLine}>Do not include credentials, tokens, private links, transcripts, provider URLs, school records, or exploit data that could harm customers.</p>
          <button className={styles.button} type="submit">Test report state</button>
        </form>
      )}
    </section>
  );
}
