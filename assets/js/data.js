// Static copy + fallbacks for the In Great Company site.
// Events and quotes come from the backend (/api/events, /api/quotes); these
// arrays are the offline/first-paint fallback, mirroring the original bundle.

export const FALLBACK_EVENTS = [
  { id: 'coffee', title: 'Coffee & Cursive', date: 'Sun, Aug 16', time: '9:30am', place: 'Foxy Loxy, Bull St', category: 'Slow morning', tone: 'cyan', price: 0,
    blurb: 'Slow morning, good pens, better company. Bring whatever you’re working on — or nothing at all.',
    detail: 'We take the back patio and stay as long as they’ll have us. Some of us journal, some of us just talk. There is no agenda and no one takes attendance.',
    tags: ['On the back patio', 'Stay as long as you like'],
    note: 'Photo — marble café table, latte, open notebook, two women laughing out of focus' },
  { id: 'dinner', title: 'Long table dinner', date: 'Thu, Aug 20', time: '6:30pm', place: 'A porch on Jones St', category: 'Long dinner', tone: 'rose', price: 24,
    blurb: 'One long table, twelve seats, one shared menu. The kind of dinner that runs past dessert.',
    detail: 'Your ticket covers the family-style menu and the table — drinks are on you. Twelve seats, and they go fast. If you’re coming alone, say so and we’ll seat you in the middle of everything.',
    tags: ['Twelve seats', 'Family-style menu'],
    note: 'Photo — long candlelit table on a Savannah porch, hands passing plates, string lights' },
  { id: 'walk', title: 'Squares walk & talk', date: 'Sat, Aug 23', time: '8:00am', place: 'Forsyth fountain', category: 'Outdoors', tone: 'cyan', price: 0,
    blurb: 'Six squares, three miles, zero small talk. We stop for coffee at the end.',
    detail: 'An easy pace under the live oaks before the heat sets in. Strollers and dogs welcome. We finish at the fountain and whoever is free keeps going to breakfast.',
    tags: ['Easy 3 miles', 'Dogs & strollers welcome'],
    note: 'Photo — women walking under Spanish moss, morning light through live oaks' },
  { id: 'workshop', title: 'Flowers & Friday night', date: 'Fri, Aug 29', time: '6:00pm', place: 'Starland District', category: 'Hands-on', tone: 'rose', price: 45,
    blurb: 'Build an arrangement, take it home, meet the woman next to you while you’re at it.',
    detail: 'Ticket covers all your stems, the vessel, and a glass of something. No experience needed — the point is the two hours, not the bouquet.',
    tags: ['All materials included', 'No experience needed'],
    note: 'Photo — hands arranging garden roses on a work table, buckets of stems behind' },
  { id: 'sunday', title: 'Slow Sunday potluck', date: 'Sun, Sep 7', time: '4:00pm', place: 'A backyard in Ardsley Park', category: 'Potluck', tone: 'gold', price: 0,
    blurb: 'Bring a dish, bring a friend, bring nothing. Somebody always brings too much.',
    detail: 'Kids and partners welcome for this one. We eat in the yard until the mosquitoes win.',
    tags: ['Kids & partners welcome', 'Bring a dish'],
    note: 'Photo — backyard table crowded with mismatched dishes, golden hour' }
];

export const FALLBACK_VOICES = [
  { tone: 'cream', name: 'Danielle', detail: 'moved here in January', quote: 'I came to a coffee thing alone on a Sunday and now I have people I text about nothing.' },
  { tone: 'deep', name: 'Victoria', detail: 'came alone in May', quote: 'This group has been such a blessing since I moved; They’ve created a welcoming, supportive community with fun events and a safe space that helped me get out, explore the city, and build friendships when I didn’t know anyone.' },
  { tone: 'cream', name: 'Jo', detail: 'here twelve years', quote: 'Twelve years in Savannah and I found the hidden gems with these women, not before them.' }
];

// One real testimonial photo keyed by name (matches the live per-card avatar hook).
export const AVATAR_BY_NAME = {
  Victoria: '/assets/img/avatar-victoria.jpg'
};

export const VALUES = [
  { title: 'Women first, always', body: 'Every gathering is planned around what makes women feel safe, seen, and unhurried — the timing, the room, the seating.' },
  { title: 'No pressure, no judgment', body: 'Come to everything or come twice a year. Cancel the morning of. Nobody keeps score and nobody needs an explanation.' },
  { title: 'The city we love', body: 'Hidden gems and old favorites, and the small businesses run by women we’d rather give our money to.' }
];

export const LINKS = {
  instagram: 'https://www.instagram.com/ingreatcompanysav',
  facebook: 'https://www.facebook.com/groups/ingreatcompanysav',
  email: 'mailto:contact@ingreatcompanysav.com',
  emailText: 'contact@ingreatcompanysav.com'
};
