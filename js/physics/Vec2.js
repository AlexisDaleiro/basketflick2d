/** Mutable vector; operations write into an existing vector. */
export class Vec2 {
  /** @param {number} [x] u. @param {number} [y] u. */
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }

  /** @param {number} x @param {number} y @returns {Vec2} */
  set(x, y) { this.x = x; this.y = y; return this; }

  /** @param {{x: number, y: number}} vector @returns {Vec2} */
  copy(vector) { return this.set(vector.x, vector.y); }

  /** @param {{x: number, y: number}} vector @returns {Vec2} */
  add(vector) { this.x += vector.x; this.y += vector.y; return this; }

  /** @param {number} scalar @returns {Vec2} */
  scale(scalar) { this.x *= scalar; this.y *= scalar; return this; }

  /** @param {{x: number, y: number}} vector @returns {number} */
  dot(vector) { return this.x * vector.x + this.y * vector.y; }

  /** @returns {number} */
  length() { return Math.hypot(this.x, this.y); }

  /** Zero vectors remain zero. @returns {Vec2} */
  normalize() { const length = this.length(); return length > 0 ? this.scale(1 / length) : this; }
}
