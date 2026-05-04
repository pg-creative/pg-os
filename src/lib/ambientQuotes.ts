/**
 * T-08 Ambient Idle — quote library
 *
 * Golden-hour, contemplative one-liners. Surface at center-bottom while the
 * UI is idle. Real attributions in `author` (rendered as small-caps after an
 * em-dash). Anonymous lines have `author: null`.
 *
 * Tone bar: Ghibli warmth, Whitman expansiveness, Pessoa drift, Bashō
 * compression. Avoid productivity / self-help / motivational register.
 */

export type AmbientQuote = {
  body: string;
  author: string | null;
};

export const ambientQuotes: AmbientQuote[] = [
  { body: "The afternoon has a long, slow heart.", author: null },
  { body: "Stillness is a form of motion.", author: "Bashō" },
  { body: "Light is the first painter.", author: null },
  { body: "We are made of moments.", author: "Mary Oliver" },
  { body: "Tomorrow is older than yesterday.", author: null },
  { body: "I contain multitudes.", author: "Whitman" },
  { body: "The world is wide and I will not waste it.", author: "Robert Louis Stevenson" },
  { body: "Even the wind asks where the river goes.", author: null },
  { body: "There is a crack in everything. That's how the light gets in.", author: "Leonard Cohen" },
  { body: "The wind in the pines carries a small, blue song.", author: null },
  { body: "All the days are doors.", author: null },
  { body: "Sit. Feast on your life.", author: "Derek Walcott" },
  { body: "Old pond — a frog jumps in — sound of water.", author: "Bashō" },
  { body: "We do not remember days, we remember moments.", author: "Pavese" },
  { body: "The soft animal of your body loves what it loves.", author: "Mary Oliver" },
  { body: "Look at the sky, never let it go.", author: null },
  { body: "Some afternoons are the entire summer.", author: null },
  { body: "I have been a wanderer among distant fields.", author: "Wordsworth" },
  { body: "The wide hour turns gold and forgets us kindly.", author: null },
  { body: "Sleep is good, death is better; but the best is never to have been born.", author: "Heine" },
  { body: "Listen — a thrush is folding the dusk.", author: null },
  { body: "What you seek is seeking you.", author: "Rumi" },
  { body: "I would rather sit on a pumpkin and have it all to myself.", author: "Thoreau" },
  { body: "The fields breathe out their long blue patience.", author: null },
  { body: "There is another world, and it is in this one.", author: "Éluard" },
  { body: "To live is to be slowly born.", author: "Saint-Exupéry" },
  { body: "I do not know what the soul is. I know it is heavy and warm.", author: "Pessoa" },
  { body: "Beneath the cherry — the soup, the salad — petals.", author: "Bashō" },
  { body: "All shall be well, and all manner of thing shall be well.", author: "Julian of Norwich" },
  { body: "The slow ones inherit the late afternoon.", author: null },
  { body: "We were the first that ever burst into that silent sea.", author: "Coleridge" },
  { body: "Every leaf is a small green country.", author: null },
  { body: "What we love we shall grow to resemble.", author: "Bernard of Clairvaux" },
  { body: "The sun, like a lazy cat, stretches across the floor.", author: null },
  { body: "Tell me, what is it you plan to do with your one wild and precious life?", author: "Mary Oliver" },
  { body: "There are years that ask questions and years that answer.", author: "Zora Neale Hurston" },
  { body: "Beauty will save the world.", author: "Dostoevsky" },
  { body: "I am still learning.", author: "Michelangelo" },
  { body: "Even the longest day folds like a paper crane.", author: null },
  { body: "The river knows where it is going. So do you.", author: null },
  { body: "Hold to the now, the here, through which all future plunges to the past.", author: "Joyce" },
  { body: "A small rain on a wide field.", author: null },
  { body: "The stars are not afraid to appear like fireflies.", author: "Tagore" },
  { body: "Walk slowly and drink the road.", author: null },
  { body: "Each evening dies into the next.", author: "Pessoa" },
];

export function pickQuote(index: number): AmbientQuote {
  const i = ((index % ambientQuotes.length) + ambientQuotes.length) % ambientQuotes.length;
  return ambientQuotes[i];
}
