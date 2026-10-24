/**
 * Built-in newsletter starting points (separate from the user's saved sets:
 * they can't be renamed or deleted). Brand-neutral on purpose — the app
 * serves any store. Square brackets mark what the user should replace.
 */
export interface NewsletterTemplate {
  id: string;
  name: string;
  /** One line shown under the name in the picker. */
  blurb: string;
  heading: string;
  body: string;
}

export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'store-update',
    name: 'Store update',
    blurb: 'General news in a short paragraph or two.',
    heading: 'News from [store name]',
    body:
      '<p>[One or two sentences about what’s new: a remodel, a new team member, a service you now offer.]</p>' +
      '<p>[Why it matters to the customer, and what they should do next — visit, call, or reply to this email.]</p>',
  },
  {
    id: 'event',
    name: 'Event / trunk show',
    blurb: 'Date, time, what to expect, and an RSVP line.',
    heading: 'You’re invited: [event name]',
    body:
      '<p><strong>[Day, Month Date] · [Start time]–[End time]</strong><br>[Store name], [location in the shopping center]</p>' +
      '<ul><li><p>[What guests will see or try]</p></li><li><p>[Special offer or gift for attendees]</p></li><li><p>[Refreshments, guest expert, or other highlight]</p></li></ul>' +
      '<p>Reply to this email or call [phone] to save your spot.</p>',
  },
  {
    id: 'holiday',
    name: 'Holiday hours & shipping',
    blurb: 'Order-by dates, gift wrap, and returns.',
    heading: 'Holiday shipping & gift services',
    body:
      '<ul><li><p><strong>Order by [date]</strong> for standard delivery before [holiday].</p></li><li><p><strong>Order by [date]</strong> for express delivery.</p></li><li><p>Free gift wrapping on [all orders / orders over $X].</p></li><li><p>Extended returns: gifts bought [date range] can be returned until [date].</p></li></ul>' +
      '<p>[Any changed store hours — or add them in the Special Hours card.]</p>',
  },
  {
    id: 'new-arrivals',
    name: 'New arrivals',
    blurb: 'A short intro, a list of highlights, and a photo.',
    heading: 'Just arrived: [collection or season]',
    body:
      '<p>[One sentence that sets the scene for the new arrivals.]</p>' +
      '<ul><li><p><strong>[Product name]</strong> — [what makes it special]</p></li><li><p><strong>[Product name]</strong> — [what makes it special]</p></li><li><p><strong>[Product name]</strong> — [what makes it special]</p></li></ul>' +
      '<p>[Add a product photo with the image button, then tell readers where to see them in person.]</p>',
  },
];
