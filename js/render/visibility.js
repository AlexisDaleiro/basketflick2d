import { FRONTAL_NET_DEPTH } from '../config/constants.js';

/** The confirmed basket the mesh is still holding, if any. @param {import('../game/Ball.js').Ball[]} balls @param {import('../game/FrontalHoop.js').FrontalHoop} hoop @returns {import('../game/Ball.js').Ball|null} */
export function ballInNet(balls, hoop) {
  for (const ball of balls) {
    if (ball.state === 'dead' && ball.outcome === 'basket' && ball.position.y - ball.radius < hoop.rimY + FRONTAL_NET_DEPTH) return ball;
  }
  return null;
}

/** Select a depth layer using the same board slab/ring geometry as physics. @param {import('../game/Ball.js').Ball} ball @param {import('../game/FrontalHoop.js').FrontalHoop} hoop @returns {'behind-board'|'inside-hoop'|'foreground'} */
export function ballLayer(ball, hoop) {
  if (ball.depth - ball.radius >= hoop.board.maxZ) return 'behind-board';
  if (ball.depth >= hoop.depth - ball.radius || (ball.state === 'dead' && ball.outcome === 'basket')) return 'inside-hoop';
  return 'foreground';
}
