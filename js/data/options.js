import { L } from '../i18n.js';

export const GOALS = [
  ['strength', L('Become stronger', 'Stärker werden')],
  ['fitness', L('Improve fitness', 'Fitness verbessern')],
  ['football', L('Improve football performance', 'Besser im Fußball werden')],
  ['routine', L('Build a consistent routine', 'Eine feste Routine aufbauen')],
  ['athletic', L('Improve general athletic ability', 'Allgemeine Athletik verbessern')],
  ['learn', L('Learn new exercises', 'Neue Übungen lernen')],
];

export const AREAS_TO_IMPROVE = [
  ['upper', L('Upper body', 'Oberkörper')],
  ['lower', L('Legs & glutes', 'Beine & Gesäß')],
  ['core', L('Core', 'Rumpf')],
  ['endurance', L('Endurance', 'Ausdauer')],
  ['speed', L('Speed & agility', 'Schnelligkeit & Beweglichkeit')],
];

export const EXPERIENCE = [
  ['beginner', L('Beginner', 'Anfänger'), L('New to training or getting back into it.', 'Neu im Training oder Wiedereinstieg.')],
  ['intermediate', L('Intermediate', 'Fortgeschritten'), L('Training regularly for a few months.', 'Trainiere seit ein paar Monaten regelmäßig.')],
  ['advanced', L('Advanced', 'Profi'), L('Training consistently for a year or more.', 'Trainiere seit einem Jahr oder länger konstant.')],
];

export const MINUTES = [10, 15, 20, 30, 45, 60];
export const DAYS_PER_WEEK = [1, 2, 3, 4, 5, 6];

export const label = (list, id) => (list.find(x => x[0] === id) || [, id])[1];
