// Key poses for the exercise animations (viewBox 200 × 128, floor at y = 104).
// Side view faces right. Index 0 = near arm/leg (bright), 1 = far arm/leg (dim).
// seq: [poseName, ms] – blend from this pose to the next one over ms (same pose twice = hold).
const STAND = { hip: [100, 57.8], torso: -90, hands: [[101, 58], [99, 58]], feet: [[102, 102], [98, 102]], toe: [0, 0] };
const PLANK_HIGH = { hip: [90.5, 86.8], torso: -23, hands: [[118, 104], [121, 104]], feet: [[50, 103], [53, 103]] };
const LYING_BACK = { hip: [90, 99], torso: 0, head: 0, hands: [[108, 96], [110, 96]], feet: [[68, 102], [66, 102]], kb: [1, 1] };

const REP = (a, b, hold = 400, move = 800, holdB = 250) => [[a, hold], [a, move], [b, holdB], [b, move]];

export const ANIMS = {
  squat: {
    hl: ['quads', 'glutes', 'calves'],
    poses: { up: STAND, down: { hip: [82, 78], torso: -55, hands: [[128, 53], [126, 55]], feet: [[102, 102], [98, 102]], toe: [0, 0] } },
    seq: REP('up', 'down', 500, 900, 300),
  },
  lunge: {
    hl: ['quads', 'glutes', 'hamstrings', 'calves'],
    poses: { up: STAND, down: { hip: [100, 80], torso: -90, hands: [[101, 79], [99, 79]], feet: [[124, 102], [78, 102]], toe: [0, 20] } },
    seq: REP('up', 'down', 500, 900, 300),
  },
  'calf-raise': {
    hl: ['calves'],
    poses: { down: STAND, up: { ...STAND, hip: [100, 53], hands: [[101, 52], [99, 52]], feet: [[102, 97], [98, 97]], toe: [45, 45] } },
    seq: REP('down', 'up', 400, 600, 500),
  },
  'wall-sit': {
    hl: ['quads', 'glutes'],
    props: [{ type: 'wall', x: 70 }],
    poses: {
      a: { hip: [78, 80], torso: -90, hands: [[97, 79], [95, 80]], feet: [[101, 102], [99, 102]], toe: [0, 0] },
      b: { hip: [78, 81], torso: -90, hands: [[97, 80], [95, 81]], feet: [[101, 102], [99, 102]], toe: [0, 0] },
    },
    seq: [['a', 1400], ['b', 1400]],
  },
  pushup: {
    hl: ['chest', 'triceps', 'shoulders'],
    vb: '18 30 172 84',
    poses: { up: PLANK_HIGH, down: { ...PLANK_HIGH, hip: [93, 94.5], torso: -12.5 } },
    seq: REP('up', 'down', 500, 800, 250),
  },
  'incline-pushup': {
    hl: ['chest', 'triceps', 'shoulders'],
    vb: '18 30 172 84',
    props: [{ type: 'box', x: 116, y: 80, w: 34, h: 24 }],
    poses: {
      up: { hip: [102.7, 72.4], torso: -45.8, hands: [[125, 80], [128, 80]], feet: [[72, 103], [75, 103]] },
      down: { hip: [106.7, 76.9], torso: -38, hands: [[125, 80], [128, 80]], feet: [[72, 103], [75, 103]] },
    },
    seq: REP('up', 'down', 500, 800, 250),
  },
  crunch: {
    hl: ['abs'], back: true,
    vb: '18 30 172 84',
    poses: { down: LYING_BACK, up: { ...LYING_BACK, torso: -28, head: -34, hands: [[104, 88], [106, 88]] } },
    seq: REP('down', 'up', 400, 600, 300),
  },
  situp: {
    hl: ['abs', 'hipflex'], back: true,
    vb: '18 30 172 84',
    poses: { down: LYING_BACK, up: { ...LYING_BACK, torso: -78, head: -80, hands: [[100, 80], [102, 80]] } },
    seq: REP('down', 'up', 400, 900, 300),
  },
  plank: {
    hl: ['abs', 'shoulders', 'forearms'],
    vb: '18 30 172 84',
    poses: {
      a: { hip: [88.8, 93.9], torso: -13.3, hands: [[132, 102], [135, 102]], feet: [[46, 103], [49, 103]] },
      b: { hip: [88.8, 92.6], torso: -13.3, hands: [[132, 102], [135, 102]], feet: [[46, 103], [49, 103]] },
    },
    seq: [['a', 1600], ['b', 1600]],
  },
  'side-plank': {
    hl: ['obliques', 'shoulders', 'glutes'],
    vb: '18 30 172 84',
    poses: {
      down: { hip: [92, 97], torso: -27, hands: [[118, 54], [131, 102]], feet: [[50, 103], [48, 103]] },
      up: { hip: [92, 90.8], torso: -17.4, hands: [[120, 52], [131, 102]], feet: [[50, 103], [48, 103]] },
    },
    seq: [['down', 300], ['down', 800], ['up', 1600], ['up', 800]],
  },
  'jumping-jack': {
    hl: ['shoulders', 'quads', 'calves'],
    front: true,
    poses: {
      closed: { front: true, hip: [100, 58], torso: -90, hands: [[110, 62], [90, 62]], feet: [[104, 102], [96, 102]] },
      open: { front: true, hip: [100, 56], torso: -90, hands: [[128, 4], [72, 4]], feet: [[120, 100], [80, 100]] },
    },
    seq: [['closed', 80], ['closed', 320], ['open', 80], ['open', 320]],
  },
  burpee: {
    hl: ['quads', 'chest', 'abs', 'shoulders'],
    poses: {
      stand: STAND,
      crouch: { hip: [86, 86], torso: -22, hands: [[116, 103], [119, 103]], feet: [[102, 102], [98, 102]], toe: [0, 0] },
      plank: { ...PLANK_HIGH, feet: [[50, 98], [53, 98]], toe: [70, 70] },
      jump: { hip: [100, 50], torso: -90, hands: [[108, -8], [106, -8]], feet: [[102, 94], [98, 94]], toe: [30, 30] },
    },
    seq: [['stand', 350], ['stand', 450], ['crouch', 400], ['plank', 350], ['plank', 400], ['crouch', 400], ['stand', 300], ['jump', 350]],
  },
  'mountain-climber': {
    hl: ['abs', 'shoulders', 'hipflex'],
    vb: '18 30 172 84',
    poses: {
      a: { hip: [90.5, 84], torso: -21, hands: [[119, 104], [122, 104]], feet: [[104, 96], [52, 99]] },
      b: { hip: [90.5, 84], torso: -21, hands: [[119, 104], [122, 104]], feet: [[52, 99], [104, 96]] },
    },
    seq: [['a', 120], ['a', 260], ['b', 120], ['b', 260]],
  },
  'glute-bridge': {
    hl: ['glutes', 'hamstrings'], back: true,
    vb: '18 30 172 84',
    poses: {
      down: { hip: [94, 99], torso: 0, head: 0, hands: [[106, 102], [108, 102]], feet: [[72, 102], [70, 102]], kb: [1, 1], eb: [-1, -1] },
      up: { hip: [96, 83], torso: 32, head: 0, hands: [[106, 102], [108, 102]], feet: [[72, 102], [70, 102]], kb: [1, 1], eb: [-1, -1] },
    },
    seq: REP('down', 'up', 400, 700, 500),
  },
  superman: {
    hl: ['back', 'glutes'],
    vb: '18 30 172 84',
    poses: {
      down: { hip: [92, 100], torso: 0, head: 0, hands: [[150, 101], [152, 101]], feet: [[50, 101], [48, 101]], kb: [1, 1] },
      up: { hip: [92, 100], torso: -12, head: -18, hands: [[148, 84], [150, 85]], feet: [[51, 92], [49, 93]], kb: [1, 1] },
    },
    seq: REP('down', 'up', 400, 700, 600),
  },
  'high-knees': {
    hl: ['quads', 'hipflex', 'calves'],
    poses: {
      a: { hip: [100, 58], torso: -88, hands: [[92, 56], [114, 40]], feet: [[120, 80], [98, 102]], toe: [20, 0] },
      b: { hip: [100, 58], torso: -88, hands: [[114, 40], [92, 56]], feet: [[98, 102], [120, 80]], toe: [0, 20] },
    },
    seq: [['a', 140], ['a', 220], ['b', 140], ['b', 220]],
  },
  'skater-jump': {
    hl: ['glutes', 'quads', 'calves'],
    front: true,
    poses: {
      a: { front: true, hip: [84, 61], torso: -96, hands: [[110, 60], [96, 62]], feet: [[96, 96], [80, 102]] },
      mid: { front: true, hip: [100, 54], torso: -90, hands: [[114, 56], [86, 56]], feet: [[106, 96], [94, 96]] },
      b: { front: true, hip: [116, 61], torso: -84, hands: [[104, 62], [90, 60]], feet: [[120, 102], [104, 96]] },
    },
    seq: [['a', 250], ['a', 300], ['mid', 300], ['b', 250], ['b', 300], ['mid', 300]],
  },
  'standing-twist': {
    front: true, hl: ['abs', 'obliques', 'quads'],
    poses: {
      left: { front: true, hip: [100, 60], torso: -92, hands: [[96, 40], [74, 42]], feet: [[110, 102], [90, 102]] },
      mid: { front: true, hip: [100, 60], torso: -90, hands: [[114, 36], [86, 36]], feet: [[110, 102], [90, 102]] },
      right: { front: true, hip: [100, 60], torso: -88, hands: [[126, 42], [104, 40]], feet: [[110, 102], [90, 102]] },
    },
    seq: [['left', 200], ['left', 500], ['mid', 200], ['right', 200], ['right', 500], ['mid', 200]],
  },
};
