export function getGameCenterId(size: number, index: number): string {
  return size.toString() + index.toString().padStart(76, "0");
}
