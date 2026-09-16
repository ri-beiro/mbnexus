/** Triggers a browser download of `content` as a file — plain DOM plumbing
 * with no business logic of its own, so it's exercised via the call site's
 * tests (which mock this module) rather than tested directly here. */
export function downloadTextFile(filename: string, content: string, mimeType = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
