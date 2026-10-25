// /api/admin/team/:id — PUT (update) + DELETE.
import { item } from '../../../_shared/crud.js';

export const { onRequestPut, onRequestDelete } = item('team');
