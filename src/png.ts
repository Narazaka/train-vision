/** Windows で使えない文字を落とす。全角の × もファイル名では避ける */
function safeName(text: string): string {
  return text.replace(/[\\/:*?"<>|×]/g, "").trim() || "vision";
}

/**
 * SVG を scale 倍でラスタライズして PNG として保存する。
 * @returns 書き出したファイル名
 */
export async function savePng(svg: SVGSVGElement, scale: number, label: string): Promise<string> {
  const w = svg.viewBox.baseVal.width * scale;
  const h = svg.viewBox.baseVal.height * scale;

  const src = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("SVG のラスタライズに失敗しました"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
  });

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("PNG の生成に失敗しました");

  const name = `train-vision-${safeName(label)}-${w}x${h}.png`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // クリックの処理中に消すと download 属性を読めないことがあるので、片付けは遅らせる
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
  return name;
}
