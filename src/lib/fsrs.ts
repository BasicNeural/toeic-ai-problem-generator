import { FSRS, Card, Rating, State } from 'fsrs.js';
import { FSRSState } from '../types';

const fsrs = new FSRS();

export function schedule(state: FSRSState, rating: Rating): FSRSState {
  const card: Card = {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  };

  const now = new Date();
  const schedulingCards = fsrs.repeat(card, now);
  const updatedCard = schedulingCards[rating].card;

  const result: FSRSState = {
    due: updatedCard.due.toISOString(),
    stability: updatedCard.stability,
    difficulty: updatedCard.difficulty,
    elapsed_days: updatedCard.elapsed_days,
    scheduled_days: updatedCard.scheduled_days,
    reps: updatedCard.reps,
    lapses: updatedCard.lapses,
    state: updatedCard.state,
  };

  if (updatedCard.last_review) {
    result.last_review = updatedCard.last_review.toISOString();
  }

  return result;
}

export function createInitialFSRS(): FSRSState {
  const now = new Date().toISOString();
  return {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0, // New
  };
}

export { Rating };
