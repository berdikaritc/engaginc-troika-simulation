// Choose a simulation and a speed from 1 (slowest) through 9 (fastest).
const ACTIVE_SIMULATION = 'S1';
const ANIMATION_SPEED = 5;

const S1_DRAW = [
  '1-swimming trunk','wildcard+cut WC4','wildcard W9','3-pyramid','1-house roof','2-laptop','2-pizza slice','3-golf ball','3-tv','1-table','wildcard W5','wildcard W10','2-watermelon','1-pyramid','3-drum','1-tent','3-tennis ball','wildcard W3','wildcard W12','2-swimming trunk','2-golf ball','wildcard+cut WC2','1-watermelon','1-hat','1-piano','1-golf ball','3-paper airplane','3-watermelon','1-basket ball','2-tennis ball','3-jelly','2-bed','3-pizza slice','1-jelly','2-jelly','1-bed','3-tent','1-tv','2-cloth hanger','3-grape','3-dice','wildcard+cut WC1','wildcard W11','2-pyramid','1-orange','3-orange','3-basket ball','2-house roof','wildcard+cut WC5','wildcard+cut WC6','2-cupboard','2-handphone','3-cupboard','2-dice','2-piano','2-grape','1-the triangle','wildcard W7','3-piano','wildcard W2','1-pizza slice','wildcard W6','2-alphabet block','1-paper airplane','3-table','wildcard W4','wildcard+cut WC3','3-swimming trunk','2-cake slice','1-tennis ball','2-tent','wildcard W8','3-the triangle','3-cloth hanger','3-hat','2-hat','1-alphabet block','3-alphabet block','3-cake slice','1-laptop','1-grape','2-the triangle','2-orange','2-paper airplane','wildcard W1','1-dice','2-drum','1-drum','1-cake slice','3-handphone','2-basket ball','3-laptop','1-cloth hanger','2-table','3-bed','1-handphone','1-cupboard','2-tv','3-house roof'
];

const simulations = {
  S1: {
    initialState: { DRAW: S1_DRAW, P1: [], P2: [], DISCARD: [] },
    turns: [
      { steps: [{ summary: 'Each player is drawn 9 cards', moves: [
        ['1-swimming trunk','DRAW','P1'],['wildcard+cut WC4','DRAW','P2'],['wildcard W9','DRAW','P1'],['3-pyramid','DRAW','P2'],['1-house roof','DRAW','P1'],['2-laptop','DRAW','P2'],['2-pizza slice','DRAW','P1'],['3-golf ball','DRAW','P2'],['3-tv','DRAW','P1'],['1-table','DRAW','P2'],['wildcard W5','DRAW','P1'],['wildcard W10','DRAW','P2'],['2-watermelon','DRAW','P1'],['1-pyramid','DRAW','P2'],['3-drum','DRAW','P1'],['1-tent','DRAW','P2'],['3-tennis ball','DRAW','P1'],['wildcard W3','DRAW','P2']
      ]}] },
      { steps: [
        { summary: 'P1 discards', call: 'medium', moves: [['2-pizza slice','P1','DISCARD'],['3-tv','P1','DISCARD'],['3-drum','P1','DISCARD'],['3-tennis ball','P1','DISCARD']] },
        { summary: 'P1 draws', moves: [['wildcard W12','DRAW','P1'],['2-swimming trunk','DRAW','P1'],['2-golf ball','DRAW','P1']] },
        { summary: 'P2 discards', call: '3', moves: [['3-golf ball','P2','DISCARD'],['wildcard W10','P2','DISCARD'],['3-pyramid','P2','DISCARD']] },
        { summary: 'P2 draws', moves: [['wildcard+cut WC2','DRAW','P2'],['1-watermelon','DRAW','P2'],['1-hat','DRAW','P2']] }
      ]}
    ]
  }
};
