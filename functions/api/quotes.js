// GET /api/quotes — public. The full pool of ACTIVE quotes; the site picks a
// random subset to display on each visit.
import { publicList } from '../_shared/crud.js';

export const { onRequestGet } = publicList('quotes');
