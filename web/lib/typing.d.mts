export type Passage = {
  id: string;
  title: string;
  category: string;
  source: string;
  text: string;
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
  attempts?: number,
  errors?: number,
): {
  correct: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  progress: number;
};
