import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Locate ghostscript binary (required for PDF compression). */
export function findGhostscript() {
  for (const cmd of ["gs", "gswin64c", "gswin32c"]) {
    try {
      execFileSync("which", [cmd], { stdio: "pipe" });
      return cmd;
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Compress a PDF with ghostscript. /ebook preserves readable slides; /screen is smaller.
 */
export function compressPdf(inputPath, outputPath, profile = "/ebook") {
  const gs = findGhostscript();
  if (!gs) {
    return {
      ok: false,
      reason: "Ghostscript not installed. Run: brew install ghostscript",
    };
  }

  const result = spawnSync(
    gs,
    [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${profile}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    return {
      ok: false,
      reason: result.stderr?.trim() || `ghostscript exited ${result.status}`,
    };
  }

  if (!statSync(outputPath).size) {
    return { ok: false, reason: "ghostscript produced an empty file" };
  }

  return {
    ok: true,
    originalBytes: statSync(inputPath).size,
    compressedBytes: statSync(outputPath).size,
    outputPath,
    profile,
  };
}

function findLibreOffice() {
  for (const cmd of ["soffice", "/opt/homebrew/bin/soffice", "/usr/local/bin/soffice"]) {
    if (cmd.startsWith("/") && existsSync(cmd)) return cmd;
    try {
      execFileSync("which", [cmd], { stdio: "pipe" });
      return cmd;
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Export PPT/PPTX to PDF via LibreOffice (headless, reliable).
 */
export function convertOfficeToPdfLibreOffice(inputPath) {
  const soffice = findLibreOffice();
  if (!soffice) {
    return { ok: false, reason: "LibreOffice not installed" };
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "d1-lo2pdf-"));
  const result = spawnSync(
    soffice,
    ["--headless", "--convert-to", "pdf", "--outdir", tempDir, inputPath],
    { encoding: "utf8", timeout: 600000 }
  );

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(tempDir, `${baseName}.pdf`);

  if (result.status !== 0 || !existsSync(outputPath)) {
    rmSync(tempDir, { recursive: true, force: true });
    return {
      ok: false,
      reason: result.stderr?.trim() || result.stdout?.trim() || "LibreOffice export failed",
    };
  }

  const pdfBytes = readFileSync(outputPath);
  rmSync(tempDir, { recursive: true, force: true });
  return {
    ok: true,
    buffer: pdfBytes,
    sizeBytes: pdfBytes.length,
    convertedFrom: inputPath,
    engine: "libreoffice",
  };
}

/**
 * Export PPT/PPTX to PDF via Microsoft PowerPoint (macOS fallback).
 */
export function convertOfficeToPdfPowerPoint(inputPath) {
  const powerPointApp = "/Applications/Microsoft PowerPoint.app";
  if (!existsSync(powerPointApp)) {
    return { ok: false, reason: "Microsoft PowerPoint not installed" };
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "d1-ppt2pdf-"));
  const outputPath = path.join(tempDir, "converted.pdf");
  const escapedIn = inputPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const escapedOut = outputPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `
with timeout of 1800 seconds
  tell application "Microsoft PowerPoint"
    set thePres to open POSIX file "${escapedIn}"
    save thePres in POSIX file "${escapedOut}" as save as PDF
    close thePres saving no
  end tell
end timeout
`;

  const result = spawnSync("osascript", ["-e", script], {
    encoding: "utf8",
    timeout: 600000,
  });

  if (result.status !== 0 || !existsSync(outputPath)) {
    rmSync(tempDir, { recursive: true, force: true });
    return {
      ok: false,
      reason: result.stderr?.trim() || result.stdout?.trim() || "PowerPoint export failed",
    };
  }

  const pdfBytes = readFileSync(outputPath);
  rmSync(tempDir, { recursive: true, force: true });
  return {
    ok: true,
    buffer: pdfBytes,
    sizeBytes: pdfBytes.length,
    convertedFrom: inputPath,
    engine: "powerpoint",
  };
}

/** Try LibreOffice first, then PowerPoint. */
export function convertOfficeToPdf(inputPath) {
  const lo = convertOfficeToPdfLibreOffice(inputPath);
  if (lo.ok) return lo;
  return convertOfficeToPdfPowerPoint(inputPath);
}

/**
 * If a file exceeds maxBytes, try PDF compression before upload.
 * PPT/PPTX: try companion PDF, then PowerPoint export, then ghostscript on PDF.
 */
export function prepareUploadPayload(localPath, { compress = false, maxBytes, resourceName = null }) {
  const size = statSync(localPath).size;
  if (size <= maxBytes) {
    return {
      ok: true,
      buffer: readFileSync(localPath),
      compressed: false,
      converted: false,
      sizeBytes: size,
    };
  }

  const ext = path.extname(localPath).toLowerCase();
  const isOffice = [".ppt", ".pptx"].includes(ext);
  const isPdf = ext === ".pdf";

  if (isOffice && compress) {
    const converted = convertOfficeToPdf(localPath);
    if (converted.ok) {
      if (converted.sizeBytes <= maxBytes) {
        return {
          ok: true,
          buffer: converted.buffer,
          compressed: false,
          converted: true,
          sizeBytes: converted.sizeBytes,
          originalBytes: size,
        };
      }
      const tempDir = mkdtempSync(path.join(tmpdir(), "d1-compress-"));
      const tempPdf = path.join(tempDir, "from-ppt.pdf");
      writeFileSync(tempPdf, converted.buffer);
      try {
        for (const profile of ["/ebook", "/screen", "/printer"]) {
          const outPath = path.join(tempDir, `out${profile.replace("/", "-")}.pdf`);
          const result = compressPdf(tempPdf, outPath, profile);
          if (result.ok && result.compressedBytes <= maxBytes) {
            return {
              ok: true,
              buffer: readFileSync(outPath),
              compressed: true,
              converted: true,
              sizeBytes: result.compressedBytes,
              originalBytes: size,
              profile: result.profile,
            };
          }
        }
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  if (!isPdf) {
    return {
      ok: false,
      skip: true,
      reason: `${path.basename(localPath)} is ${formatMb(size)} MB (${ext} — ${isOffice ? "PowerPoint export failed or still too large" : "cannot compress in-script"})`,
      sizeBytes: size,
    };
  }

  if (!compress) {
    return {
      ok: false,
      skip: true,
      reason: `${path.basename(localPath)} is ${formatMb(size)} MB (re-run with --compress or raise UPLOAD_MAX_MB)`,
      sizeBytes: size,
    };
  }

  const gs = findGhostscript();
  if (!gs) {
    return {
      ok: false,
      skip: true,
      reason: `${path.basename(localPath)} is ${formatMb(size)} MB — install ghostscript: brew install ghostscript`,
      sizeBytes: size,
    };
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "d1-compress-"));
  try {
    for (const profile of ["/ebook", "/screen", "/printer"]) {
      const outPath = path.join(tempDir, `compressed${profile.replace("/", "-")}.pdf`);
      const result = compressPdf(localPath, outPath, profile);
      if (!result.ok) continue;
      if (result.compressedBytes <= maxBytes) {
        return {
          ok: true,
          buffer: readFileSync(outPath),
          compressed: true,
          converted: false,
          sizeBytes: result.compressedBytes,
          originalBytes: result.originalBytes,
          profile: result.profile,
        };
      }
    }

    return {
      ok: false,
      skip: true,
      reason: `${resourceName || path.basename(localPath)} still over limit after compression (${formatMb(size)} MB original)`,
      sizeBytes: size,
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function formatMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}
