/**
 * Prints the specified DOM node in a new window with print styling.
 */
export function printNode(node: HTMLElement): void {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  
  const styles = Array.from(document.querySelectorAll("style, link[rel=stylesheet]"))
    .map((n) => n.outerHTML)
    .join("\n");

  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8">${styles}</head><body><div class="print-area">${node.outerHTML}</div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`,
  );
  w.document.close();
}
