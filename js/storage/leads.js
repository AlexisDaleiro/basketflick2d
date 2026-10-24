import { LEAD_NAME_MAX } from '../config/constants.js';

/** Optional Uruguayan mobile, normalized to E.164; null means invalid. @param {string} input @returns {string|null} */
export function normalizePhone(input) {
  const phone = String(input).trim().replace(/[\s-]/g, '');
  if (!phone) return '';
  const match = /^(?:0|\+?598)?(9\d{7})$/.exec(phone);
  return match ? `+598${match[1]}` : null;
}

/** Pure form validation. Error keys are translated by the UI. @param {{name:string,phone:string,consent:boolean}} input @returns {any} */
export function validateLead(input) {
  const name = String(input.name || '').trim().slice(0, LEAD_NAME_MAX);
  const phone = normalizePhone(input.phone || '');
  if (phone === null) return { ok: false, error: 'phoneInvalid' };
  if (phone && !input.consent) return { ok: false, error: 'consentRequired' };
  return { ok: true, name: name || null, phone: phone || null, consent: Boolean(phone && input.consent) };
}
