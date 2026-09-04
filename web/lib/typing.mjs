export const passages = {
  english:
    'slow down and find your rhythm. every small step brings you closer to where you want to be. let your thoughts flow like water and your fingers follow the quiet music of the keys. the best way to learn is to begin, stay curious, and enjoy the journey. ',
  chinese:
    '清晨的阳光穿过树叶，在书桌上落下细碎的光影。让指尖跟随思绪，找到自己的节奏。不必急于到达终点，每一次认真练习，都是向前迈出的一小步。保持专注，也记得享受此刻的宁静。',
  code: 'const rhythm = (steps) => { return steps.map((step) => step + 1); }; function practice(time) { if (time > 0) { return "keep going"; } return "well done"; } ',
};
export function stats(
  target,
  typed,
  elapsed,
  attempts = typed.length,
  errors = 0,
) {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correct++;
  return {
    correct,
    wpm: elapsed > 0 ? Math.round(correct / 5 / (elapsed / 60)) : 0,
    cpm: elapsed > 0 ? Math.round(correct / (elapsed / 60)) : 0,
    accuracy: attempts
      ? Math.round(((attempts - errors) / attempts) * 100)
      : 100,
    progress: target.length
      ? Math.round((typed.length / target.length) * 100)
      : 0,
  };
}
