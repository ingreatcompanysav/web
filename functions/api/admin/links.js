// /api/admin/links — GET (list all, including hidden/inactive) + POST (create).
// Columns and validation live in functions/_shared/resources.js.
import { collection } from '../../_shared/crud.js';

export const { onRequestGet, onRequestPost } = collection('links');
