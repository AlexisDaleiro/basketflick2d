/** Select a depth layer using the same board slab/ring geometry as physics. @param {import('../game/Ball.js').Ball} ball @param {import('../game/FrontalHoop.js').FrontalHoop} hoop @returns {'behind-board'|'inside-hoop'|'foreground'} */
export function ballLayer(ball, hoop) {
  if (ball.depth - ball.radius >= hoop.board.maxZ) return 'behind-board';
  if (ball.depth >= hoop.depth - ball.radius || (ball.state === 'dead' && ball.outcome === 'basket')) return 'inside-hoop';
  return 'foreground';
}
