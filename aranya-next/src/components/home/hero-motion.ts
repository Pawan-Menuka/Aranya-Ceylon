// Scroll values fan out to canvas/styles without re-rendering the hero tree.
export interface HeroMotionState {
  progress: number;
  active: boolean;
  mobile: boolean | null;
  staticMode: boolean;
}
export interface HeroMotion {
  read(): HeroMotionState;
  update(state: HeroMotionState): void;
  subscribe(listener: (state: HeroMotionState) => void): () => void;
}
export function createHeroMotion(): HeroMotion {
  let state: HeroMotionState = { progress: 0, active: false, mobile: null, staticMode: false };
  const listeners = new Set<(state: HeroMotionState) => void>();
  return {
    read: () => state,
    update(next) {
      if (Object.keys(next).every(key => next[key as keyof HeroMotionState] === state[key as keyof HeroMotionState])) return;
      state = next; listeners.forEach(listener => listener(state));
    },
    subscribe(listener) { listeners.add(listener); listener(state); return () => { listeners.delete(listener); }; },
  };
}
