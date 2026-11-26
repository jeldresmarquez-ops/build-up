export const GOALS = [
  ['strength', 'Become stronger'],
  ['fitness', 'Improve fitness'],
  ['football', 'Improve football performance'],
  ['routine', 'Build a consistent routine'],
  ['athletic', 'Improve general athletic ability'],
  ['learn', 'Learn new exercises'],
];

export const AREAS_TO_IMPROVE = [
  ['upper', 'Upper body'],
  ['lower', 'Legs & glutes'],
  ['core', 'Core'],
  ['endurance', 'Endurance'],
  ['speed', 'Speed & agility'],
];

export const EXPERIENCE = [
  ['beginner', 'Beginner', 'New to training or getting back into it.'],
  ['intermediate', 'Intermediate', 'Training regularly for a few months.'],
  ['advanced', 'Advanced', 'Training consistently for a year or more.'],
];

export const MINUTES = [10, 15, 20, 30, 45, 60];
export const DAYS_PER_WEEK = [1, 2, 3, 4, 5, 6];

export const label = (list, id) => (list.find(x => x[0] === id) || [, id])[1];
