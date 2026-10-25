// /api/admin/team — GET (list all, including hidden) + POST (create).
// Columns and validation live in functions/_shared/resources.js.
import { collection } from '../../_shared/crud.js';

export const { onRequestGet, onRequestPost } = collection('team');
