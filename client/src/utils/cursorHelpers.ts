export function colorForSid(sid: string) {
  // deterministic pastel color by hashing sid
  let h = 0;
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 70% 55%)`;
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>').replace(/ /g, '&nbsp;');
}

export function computeCaretCoordinates(
  textarea: HTMLTextAreaElement,
  mirror: HTMLDivElement,
  position: number
): { left: number; top: number } {
  const style = window.getComputedStyle(textarea);

  // Configure mirror div to match textarea layout
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';

  // Copy layout properties from textarea to mirror
  const layoutProps = ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontSize', 'fontFamily', 'lineHeight', 'letterSpacing', 'textTransform'] as const;
  layoutProps.forEach((prop) => {
    mirror.style[prop] = style[prop];
  });

  // Place text up to cursor position, with a marker at the cursor
  const textBeforeCursor = textarea.value.slice(0, position);
  mirror.innerHTML = escapeHtml(textBeforeCursor) + '<span id="caret-marker">|</span>';

  const marker = mirror.querySelector('#caret-marker') as HTMLElement | null;
  if (!marker) return { left: 0, top: 0 };

  // Get bounding rectangles to calculate relative position
  const taRect = textarea.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();

  // Calculate cursor position relative to textarea, accounting for padding and scroll
  const left = markerRect.left - taRect.left + textarea.scrollLeft - parseFloat(style.paddingLeft || '0');
  const top = markerRect.top - taRect.top + textarea.scrollTop - parseFloat(style.paddingTop || '0');

  return { left, top };
}