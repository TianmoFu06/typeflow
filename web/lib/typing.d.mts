export const passages: Record<'english' | 'chinese' | 'code', string>;
export function stats(target: string, typed: string, elapsed: number, attempts?: number, errors?: number): {correct: number; wpm: number; cpm: number; accuracy: number; progress: number};
