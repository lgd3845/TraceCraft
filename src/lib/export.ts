export function downloadFile(
  content: Blob | string,
  filename: string,
  type = "text/plain;charset=utf-8",
) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function csvCell(value: string | number) {
  const text = String(value);
  // User-controlled names must not become formulas when opened in a spreadsheet.
  const safe = /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function sanitizeFilename(name: string, fallback = "TraceCraft") {
  return (
    name
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 60) || fallback
  );
}
