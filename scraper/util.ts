export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function randomDelay(min: number, max: number): Promise<void> {
  return delay(Math.floor(Math.random() * (max - min + 1)) + min)
}
