// /api/admin/survey-questions/:id — PUT (update) + DELETE.
import { item } from '../../../_shared/crud.js';

export const { onRequestPut, onRequestDelete } = item('survey_questions');
