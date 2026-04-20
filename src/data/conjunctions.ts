import type { Word } from '../types';

// NOTE: Hardcoded TOEIC conjunction list (no upload).
// Each item is shaped like `Word` so we can reuse the existing flashcard/FSRS flows.
// Meanings are split into two lines: Korean meaning (뜻) and an English example (예문).

export const TOEIC_CONJUNCTIONS: Word[] = [
  {
    id: 'conj-and',
    term: 'and',
    meanings: [
      { wordClass: '뜻', definition: '그리고, ~와' },
      { wordClass: '예문', definition: 'The project is on schedule, and the budget is approved.' },
    ],
    memorized: false,
    fsrs: undefined,
  },
  {
    id: 'conj-but',
    term: 'but',
    meanings: [
      { wordClass: '뜻', definition: '하지만, 그러나' },
      { wordClass: '예문', definition: 'The proposal was excellent, but the client requested revisions.' },
    ],
    memorized: false,
    fsrs: undefined,
  },
  {
    id: 'conj-or',
    term: 'or',
    meanings: [
      { wordClass: '뜻', definition: '또는, ~이거나' },
      { wordClass: '예문', definition: 'You can submit the report by email or in person.' },
    ],
    memorized: false,
    fsrs: undefined,
  },
  {
    id: 'conj-nor',
    term: 'nor',
    meanings: [
      { wordClass: '뜻', definition: '~도 아니고 ~도 아니다' },
      { wordClass: '예문', definition: 'Neither the manager nor the assistant attended the meeting.' },
    ],
    memorized: false,
    fsrs: undefined,
  },
  {
    id: 'conj-for',
    term: 'for',
    meanings: [
      { wordClass: '뜻', definition: '~이기 때문에(이유)' },
      { wordClass: '예문', definition: 'We extended the deadline, for the team needed more time.' },
    ],
    memorized: false,
    fsrs: undefined,
  },
  {
    id: 'conj-yet',
    term: 'yet',
    meanings: [
      { wordClass: '뜻', definition: '그런데도, 하지만' },
      { wordClass: '예문', definition: 'The market is competitive, yet our sales increased.' },
    ],
    memorized: false,
    fsrs: undefined,
  },
  {
    id: 'conj-so',
    term: 'so',
    meanings: [
      { wordClass: '뜻', definition: '그래서, ~하므로(결과)' },
      { wordClass: '예문', definition: 'The system crashed, so we lost the data.' },
    ],
    memorized: false,
    fsrs: undefined,
  },

  // Time
  {
    id: 'conj-when',
    term: 'when',
    meanings: [
      { wordClass: '뜻', definition: '~할 때' },
      { wordClass: '예문', definition: 'When the meeting starts, please turn off your phone.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-while',
    term: 'while',
    meanings: [
      { wordClass: '뜻', definition: '~하는 동안, ~하는 한편' },
      { wordClass: '예문', definition: "While you prepare the presentation, I'll contact the client." },
    ],
    memorized: false,
  },
  {
    id: 'conj-after',
    term: 'after',
    meanings: [
      { wordClass: '뜻', definition: '~한 후에' },
      { wordClass: '예문', definition: "After the contract is signed, we'll begin implementation." },
    ],
    memorized: false,
  },
  {
    id: 'conj-before',
    term: 'before',
    meanings: [
      { wordClass: '뜻', definition: '~하기 전에' },
      { wordClass: '예문', definition: 'Before you leave, submit your expense report.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-until',
    term: 'until',
    meanings: [
      { wordClass: '뜻', definition: '~할 때까지' },
      { wordClass: '예문', definition: "We'll wait until the approval comes through." },
    ],
    memorized: false,
  },
  {
    id: 'conj-as-soon-as',
    term: 'as soon as',
    meanings: [
      { wordClass: '뜻', definition: '~하자마자, ~하는 즉시' },
      { wordClass: '예문', definition: "As soon as the payment arrives, we'll ship the order." },
    ],
    memorized: false,
  },
  {
    id: 'conj-once',
    term: 'once',
    meanings: [
      { wordClass: '뜻', definition: '일단 ~하면, ~하자마자' },
      { wordClass: '예문', definition: "Once the project is complete, we'll conduct a review." },
    ],
    memorized: false,
  },
  {
    id: 'conj-whenever',
    term: 'whenever',
    meanings: [
      { wordClass: '뜻', definition: '~할 때마다' },
      { wordClass: '예문', definition: "Whenever there's an issue, contact the support team." },
    ],
    memorized: false,
  },

  // Cause
  {
    id: 'conj-because',
    term: 'because',
    meanings: [
      { wordClass: '뜻', definition: '~이기 때문에' },
      { wordClass: '예문', definition: 'The office closed because of the holiday.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-since',
    term: 'since',
    meanings: [
      { wordClass: '뜻', definition: '~이므로, ~해 이래로' },
      { wordClass: '예문', definition: "Since you have experience, you'll lead the project." },
    ],
    memorized: false,
  },
  {
    id: 'conj-as',
    term: 'as',
    meanings: [
      { wordClass: '뜻', definition: '~이므로, ~처럼' },
      { wordClass: '예문', definition: 'As the deadline approaches, we need to accelerate.' },
    ],
    memorized: false,
  },

  // Contrast
  {
    id: 'conj-although',
    term: 'although',
    meanings: [
      { wordClass: '뜻', definition: '~이지만, ~에도 불구하고' },
      { wordClass: '예문', definition: 'Although the cost is high, the quality is excellent.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-though',
    term: 'though',
    meanings: [
      { wordClass: '뜻', definition: '~이지만(although와 유사)' },
      { wordClass: '예문', definition: 'Though the project is challenging, the team is motivated.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-even-though',
    term: 'even though',
    meanings: [
      { wordClass: '뜻', definition: '~임에도 불구하고' },
      { wordClass: '예문', definition: 'Even though we faced delays, we met the deadline.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-whereas',
    term: 'whereas',
    meanings: [
      { wordClass: '뜻', definition: '~인 반면에' },
      { wordClass: '예문', definition: 'Whereas the old system was slow, the new one is efficient.' },
    ],
    memorized: false,
  },

  // Condition
  {
    id: 'conj-if',
    term: 'if',
    meanings: [
      { wordClass: '뜻', definition: '만약 ~라면' },
      { wordClass: '예문', definition: "If the budget is approved, we'll hire two new staff." },
    ],
    memorized: false,
  },
  {
    id: 'conj-unless',
    term: 'unless',
    meanings: [
      { wordClass: '뜻', definition: '~하지 않는 한' },
      { wordClass: '예문', definition: "Unless you have objections, we'll proceed with the plan." },
    ],
    memorized: false,
  },
  {
    id: 'conj-provided-that',
    term: 'provided that',
    meanings: [
      { wordClass: '뜻', definition: '~라는 조건으로' },
      { wordClass: '예문', definition: "Provided that the client agrees, we'll start next month." },
    ],
    memorized: false,
  },
  {
    id: 'conj-as-long-as',
    term: 'as long as',
    meanings: [
      { wordClass: '뜻', definition: '~하는 한' },
      { wordClass: '예문', definition: 'As long as you meet the deadline, the format is flexible.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-in-case',
    term: 'in case',
    meanings: [
      { wordClass: '뜻', definition: '만약 ~의 경우에 대비해' },
      { wordClass: '예문', definition: "In case there are questions, I'll prepare a FAQ document." },
    ],
    memorized: false,
  },
  {
    id: 'conj-even-if',
    term: 'even if',
    meanings: [
      { wordClass: '뜻', definition: '설령 ~이라도' },
      { wordClass: '예문', definition: "Even if the market drops, we'll maintain our strategy." },
    ],
    memorized: false,
  },

  // Purpose
  {
    id: 'conj-so-that',
    term: 'so that',
    meanings: [
      { wordClass: '뜻', definition: '~하도록, ~하기 위해' },
      { wordClass: '예문', definition: 'We automated the process so that errors decrease.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-in-order-that',
    term: 'in order that',
    meanings: [
      { wordClass: '뜻', definition: '~하기 위해' },
      { wordClass: '예문', definition: 'We hired consultants in order that we improve efficiency.' },
    ],
    memorized: false,
  },

  // Other
  {
    id: 'conj-that',
    term: 'that',
    meanings: [
      { wordClass: '뜻', definition: '~라는 것(명사절)' },
      { wordClass: '예문', definition: 'The manager announced that the office will relocate.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-whether',
    term: 'whether',
    meanings: [
      { wordClass: '뜻', definition: '~인지 아닌지' },
      { wordClass: '예문', definition: 'We need to decide whether to expand or consolidate.' },
    ],
    memorized: false,
  },

  // Correlative
  {
    id: 'conj-both-and',
    term: 'both...and',
    meanings: [
      { wordClass: '뜻', definition: '~도 그리고 ~도' },
      { wordClass: '예문', definition: 'Both the sales and marketing teams contributed to success.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-either-or',
    term: 'either...or',
    meanings: [
      { wordClass: '뜻', definition: '~이거나 ~이거나' },
      { wordClass: '예문', definition: 'Either you submit the report today or tomorrow.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-neither-nor',
    term: 'neither...nor',
    meanings: [
      { wordClass: '뜻', definition: '~도 아니고 ~도 아니다' },
      { wordClass: '예문', definition: 'Neither the vendor nor the supplier met our standards.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-not-only-but-also',
    term: 'not only...but also',
    meanings: [
      { wordClass: '뜻', definition: '~뿐만 아니라 ~도' },
      { wordClass: '예문', definition: 'The system is not only fast but also secure.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-whether-or',
    term: 'whether...or',
    meanings: [
      { wordClass: '뜻', definition: '~이든 ~이든' },
      { wordClass: '예문', definition: 'Whether you choose Plan A or Plan B, costs are similar.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-as-as',
    term: 'as...as',
    meanings: [
      { wordClass: '뜻', definition: '~만큼' },
      { wordClass: '예문', definition: "This quarter's revenue is as strong as last year's." },
    ],
    memorized: false,
  },
  {
    id: 'conj-such-that',
    term: 'such...that',
    meanings: [
      { wordClass: '뜻', definition: '그렇게 ~해서' },
      { wordClass: '예문', definition: "The demand was such that we couldn't keep up." },
    ],
    memorized: false,
  },
  {
    id: 'conj-rather-than',
    term: 'rather...than',
    meanings: [
      { wordClass: '뜻', definition: '~보다는 오히려' },
      { wordClass: '예문', definition: "We'd rather invest in training than hire externally." },
    ],
    memorized: false,
  },

  // Conjunctive adverbs (treated as conjunction-like transitions)
  {
    id: 'conj-however',
    term: 'however',
    meanings: [
      { wordClass: '뜻', definition: '그러나, 하지만' },
      { wordClass: '예문', definition: 'The proposal was rejected; however, we can revise it.' },
    ],
    memorized: false,
  },
  {
    id: 'conj-therefore',
    term: 'therefore',
    meanings: [
      { wordClass: '뜻', definition: '따라서, 그러므로' },
      { wordClass: '예문', definition: "Sales increased 20%; therefore, we'll expand operations." },
    ],
    memorized: false,
  },
  {
    id: 'conj-moreover',
    term: 'moreover',
    meanings: [
      { wordClass: '뜻', definition: '게다가, 더욱이' },
      { wordClass: '예문', definition: "The product is reliable; moreover, it's cost-effective." },
    ],
    memorized: false,
  },
  {
    id: 'conj-nevertheless',
    term: 'nevertheless',
    meanings: [
      { wordClass: '뜻', definition: '그럼에도 불구하고' },
      { wordClass: '예문', definition: "The market is tough; nevertheless, we're optimistic." },
    ],
    memorized: false,
  },
  {
    id: 'conj-consequently',
    term: 'consequently',
    meanings: [
      { wordClass: '뜻', definition: '결과적으로, 따라서' },
      { wordClass: '예문', definition: "The system failed; consequently, we lost a day's work." },
    ],
    memorized: false,
  },
];
