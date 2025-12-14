export function normalizeHtmlForEditor(input?: string): string {
  if (!input) return "<p></p>";

  // If it still contains \" we likely have JSON-escaped quotes; unescape them.
  // This is safe because we're only fixing quote-escaping, not executing anything.
  const looksDoubleEscaped = input.includes('\\"') || input.includes("\\/");
  let html = input;

  if (looksDoubleEscaped) {
    try {
      // Wrap in quotes so JSON.parse will unescape \", \/, etc.
      html = JSON.parse(`"${input.replace(/"/g, '\\"')}"`);
    } catch {
      // as a fallback, do a light unescape
      html = html.replace(/\\"/g, '"').replace(/\\\//g, "/");
    }
  }

  // Extra hardening: parse & re-serialize to strip weirdness while keeping nodes.
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.innerHTML || "<p></p>";
  } catch {
    return html;
  }
}
