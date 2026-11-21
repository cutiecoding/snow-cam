export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const randomRange = (min, max) => min + Math.random() * (max - min);
export const wrap = (value, size) => ((value % size) + size) % size;
export const lerpPoint = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
