import { CONTACT_EPSILON } from '../config/constants.js';

/** @typedef {{nx: number, ny: number, penetration: number}} Contact */

/** Circle versus circular rim tip. @param {{x:number,y:number}} p @param {number} radius @param {{x:number,y:number}} center @param {number} tipRadius @param {Contact} out Reused contact. @returns {boolean} */
export function circlePoint(p, radius, center, tipRadius, out) {
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  const distance = Math.hypot(dx, dy);
  const sum = radius + tipRadius;
  if (distance >= sum) return false;
  out.nx = distance > CONTACT_EPSILON ? dx / distance : 0;
  out.ny = distance > CONTACT_EPSILON ? dy / distance : -1;
  out.penetration = sum - distance;
  return true;
}

/** @param {{x:number,y:number}} p @param {number} radius @param {{minX:number,maxX:number,minY:number,maxY:number}} box @param {Contact} out @returns {boolean} */
export function circleAABB(p, radius, box, out) {
  const qx = Math.max(box.minX, Math.min(p.x, box.maxX));
  const qy = Math.max(box.minY, Math.min(p.y, box.maxY));
  const dx = p.x - qx;
  const dy = p.y - qy;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return false;
  if (distance > CONTACT_EPSILON) {
    out.nx = dx / distance;
    out.ny = dy / distance;
    out.penetration = radius - distance;
  } else {
    let nearest = p.x - box.minX;
    out.nx = -1;
    out.ny = 0;
    if (box.maxX - p.x < nearest) { nearest = box.maxX - p.x; out.nx = 1; }
    if (p.y - box.minY < nearest) { nearest = p.y - box.minY; out.nx = 0; out.ny = -1; }
    if (box.maxY - p.y < nearest) { nearest = box.maxY - p.y; out.nx = 0; out.ny = 1; }
    out.penetration = radius + nearest;
  }
  return true;
}

/** Plane normal points upward. @param {{x:number,y:number}} p @param {number} radius @param {number} floorY @param {Contact} out @returns {boolean} */
export function circlePlane(p, radius, floorY, out) {
  const penetration = p.y + radius - floorY;
  if (penetration <= 0) return false;
  out.nx = 0;
  out.ny = -1;
  out.penetration = penetration;
  return true;
}

/** Resolve in the collider's reference frame. @param {{x:number,y:number}} p @param {{x:number,y:number}} v @param {Contact} contact @param {number} restitution @param {number} friction @param {{x:number,y:number}} colliderVelocity @returns {number} Impact normal speed, u/s. */
export function resolveContact(p, v, contact, restitution, friction, colliderVelocity) {
  const { nx, ny, penetration } = contact;
  p.x += nx * penetration;
  p.y += ny * penetration;
  const rx = v.x - colliderVelocity.x;
  const ry = v.y - colliderVelocity.y;
  const vn = rx * nx + ry * ny;
  if (vn >= 0) return 0;
  v.x = -restitution * vn * nx + (1 - friction) * (rx - vn * nx) + colliderVelocity.x;
  v.y = -restitution * vn * ny + (1 - friction) * (ry - vn * ny) + colliderVelocity.y;
  return -vn;
}
