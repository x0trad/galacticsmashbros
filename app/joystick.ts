export type Movement = { x: number; y: number };
export class Joystick {
 pointer: number | null = null;
 origin: Movement = { x: 0, y: 0 };
 value: Movement = { x: 0, y: 0 };
 knob: Movement = { x: 0, y: 0 };
 readonly radius = 44;
 begin(pointer: number, origin: Movement, point: Movement) {
  if (this.pointer !== null) return false;
  this.pointer = pointer; this.origin = origin; this.move(pointer, point); return true;
 }
 move(pointer: number, point: Movement) {
  if (pointer !== this.pointer) return false;
  const x = point.x - this.origin.x, y = point.y - this.origin.y;
  const distance = Math.hypot(x, y), limit = Math.min(distance, this.radius);
  this.knob = distance ? { x: x / distance * limit, y: y / distance * limit } : { x: 0, y: 0 };
  const speed = Math.max(0, (limit - 5) / (this.radius - 5));
  this.value = distance ? { x: x / distance * speed, y: y / distance * speed } : { x: 0, y: 0 };
  return true;
 }
 end(pointer: number) { if (pointer !== this.pointer) return false; this.reset(); return true; }
 reset() { this.pointer = null; this.value = { x: 0, y: 0 }; this.knob = { x: 0, y: 0 }; }
}
