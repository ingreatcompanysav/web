// /api/admin/events/:id — PUT (update) + DELETE.
import { item } from '../../../_shared/crud.js';

export const { onRequestPut, onRequestDelete } = item('events');
