import type { LevelConfig } from '../core/types';

/** Career stages, in escalating order of absurdity. */
export const LEVELS: LevelConfig[] = [
  {
    id: 0,
    name: 'THE GARAGE',
    tagline: 'Move fast. Break things. Definitely break things.',
    interestRate: 0.03,
    sustainableDebt: 60,
    bugRateBase: 0.25,
    distanceGoal: 600,
    bgColor: 0x12141f,
  },
  {
    id: 1,
    name: 'SERIES A CRUNCH',
    tagline: 'The VCs want the demo tomorrow. It is currently tomorrow.',
    interestRate: 0.05,
    sustainableDebt: 90,
    bugRateBase: 0.4,
    distanceGoal: 1600,
    bgColor: 0x1a1320,
  },
  {
    id: 2,
    name: 'THE BIG REWRITE',
    tagline: 'Half legacy, half microservice, zero finished.',
    interestRate: 0.075,
    sustainableDebt: 120,
    bugRateBase: 0.6,
    distanceGoal: 3200,
    bgColor: 0x101f1a,
  },
  {
    id: 3,
    name: 'AI-POWERED EVERYTHING',
    tagline: 'Can we add blockchain AND a chatbot? By Friday?',
    interestRate: 0.1,
    sustainableDebt: 150,
    bugRateBase: 0.85,
    distanceGoal: 5600,
    bgColor: 0x1f1410,
  },
  {
    id: 4,
    name: 'LEGACY MAINFRAME',
    tagline: "It's 3am. The COBOL is awake. It knows your name.",
    interestRate: 0.14,
    sustainableDebt: 190,
    bugRateBase: 1.2,
    distanceGoal: 9000,
    bgColor: 0x1f1010,
  },
];

/** Random PM / manager / investor interruptions. Pure satire fuel. */
export const QUIPS: string[] = [
  'PM: Can we add dark mode by EOD?',
  'CEO: I told the board it ships Friday.',
  'PM: Quick question — is the rewrite done?',
  'Sales: I promised the client this feature. It does not exist.',
  'VC: Have you considered AI?',
  'Designer: I moved the button 2px. Reship.',
  'Manager: Why is velocity down?',
  'PM: It works on my machine, so...',
  'Recruiter: We hired 4 more. They start Monday.',
  'Legal: Please remove that comment from the code.',
  'CTO: We are now a Rust shop. Effective immediately.',
  "Intern: I force-pushed to main. Sorry?",
  'Investor: What is your moat? Is the moat AI?',
  'PM: Just a small change, should be 5 minutes.',
  'Ops: The free tier expired. In production.',
];
