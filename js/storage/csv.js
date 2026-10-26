/** @param {unknown} value @returns {string} */
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
/** @param {string|null} phone @returns {string} */
export function localPhone(phone) {
  if (!phone) return '';
  const number = phone.replace(/^\+598/, '0');
  return `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
}
/** @param {number} timestamp @returns {{date:string,time:string}} */
export function localDateTime(timestamp) {
  const date = new Date(timestamp); const pad = value => String(value).padStart(2, '0');
  return { date: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` };
}
/** Pure Excel-friendly CSV, including original names and consent. @param {any[]} plays @param {{eventName:string,deviceLabel:string}} context @returns {string} */
export function createCsv(plays, context) {
  const header = 'id;fecha;hora;evento;tablet;nombre;telefono;email;consentimiento;puntaje;canastas;tiros;precision_pct;swishes;mejor_racha;duracion_s;gano_premio;codigo_premio;premio_entregado';
  const lines = [header];
  for (const play of plays) {
    const { date, time } = localDateTime(play.ts);
    lines.push([play.id, date, time, context.eventName, context.deviceLabel, play.name, localPhone(play.phone), play.email,
      play.consent ? 1 : 0, play.score, play.baskets, play.shots, play.shots ? Math.round(play.baskets / play.shots * 100) : 0,
      play.swishes, play.bestStreak, play.durationSec, play.prizeWon ? 1 : 0, play.prizeCode, play.prizeDelivered ? 1 : 0].map(csvCell).join(';'));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
/** @param {string} text @returns {string} */
export function slug(text) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'evento'; }
/** @param {string} event @param {string} tablet @param {number} timestamp @returns {string} */
export function csvFilename(event, tablet, timestamp) {
  const date = new Date(timestamp); const pad = value => String(value).padStart(2, '0');
  return `threeball2d_${slug(event)}_${slug(tablet)}_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.csv`;
}
