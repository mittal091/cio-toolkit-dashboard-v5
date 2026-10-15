import { escapeHtml as esc } from '../format.js';

/* A label for a group of blocks, phrased as the question the group answers. */
export const section = ({ title, question }) =>
  `<div class="sec-h"><h2>${esc(title)}</h2><span>${esc(question)}</span></div>`;
