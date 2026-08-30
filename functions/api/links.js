// GET /api/links — public. The active links, in order, for the /links page.
import { publicList } from '../_shared/crud.js';

export const { onRequestGet } = publicList('links');
