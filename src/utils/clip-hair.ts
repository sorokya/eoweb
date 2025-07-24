export function clipHair(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const imgData = ctx.getImageData(0, 0, width, height);

  for (let i = 0; i < imgData.data.length; i += 4) {
    if (
      imgData.data[i] === 0 &&
      imgData.data[i + 1] === 0 &&
      imgData.data[i + 2] === 0
    ) {
      imgData.data[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
