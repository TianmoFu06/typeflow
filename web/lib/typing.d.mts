export type Passage = {
  id: string;
  title: string;
  category: string;
  source: string;
  text: string;
  sourceUrl?: string;
  edition?: string;
  format: string;
};
export const passages: Record<'english' | 'chinese' | 'code', Passage[]>;
export function nextPassageIndex(
  length: number,
  current: number,
  random?: number,
): number;
export function stats(
  target: string,
  typed: string,
  elapsed: number,
): {
  correct: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  progress: number;
};

export function practiceClock(
  duration: number,
  elapsed: number,
): { elapsed: number; done: boolean };
export function displayCharacter(
  expected: string,
  actual: string | undefined,
): string;
