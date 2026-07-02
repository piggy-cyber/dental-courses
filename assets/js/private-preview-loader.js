(function loadPrivatePreviewData() {
  if (!/^(127\.0\.0\.1|localhost)$/.test(window.location.hostname)) return;

  const scripts = [
    "assets/js/youtube-videos.private.js",
    "assets/js/transcript-content.private.js"
  ];
  let remaining = scripts.length;
  const state = Object.fromEntries(scripts.map((src) => [src, "queued"]));
  const completed = new Set();

  function emit() {
    window.d1PrivateDataReady = remaining === 0;
    window.d1PrivatePreviewState = state;
    window.dispatchEvent(new CustomEvent("d1-private-data-ready"));
  }

  function done(src, status) {
    if (completed.has(src)) return;
    completed.add(src);
    state[src] = status;
    remaining -= 1;
    emit();
  }

  emit();
  scripts.forEach((src) => {
    const script = document.createElement("script");
    state[src] = "loading";
    script.src = `${src}?v=20260702b`;
    script.onload = () => done(src, "loaded");
    script.onerror = () => done(src, "unavailable");
    document.head.appendChild(script);
    emit();
    window.setTimeout(() => done(src, "timeout"), 4000);
  });
})();
