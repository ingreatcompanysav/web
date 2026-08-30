// GET /api/events — public. Everything except hidden (draft/cancelled) events,
// each flagged past or upcoming. See the `events` entry in _shared/resources.js
// for the visibility rule and the timezone shift behind that flag.
import { publicList } from '../_shared/crud.js';

export const { onRequestGet } = publicList('events');
