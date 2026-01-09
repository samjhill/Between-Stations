/**
 * About page content configuration
 * This is the single source of truth for all About page content
 */

export interface AboutContent {
  identity: {
    projectName: string;
    pageTitle: string;
    personalIntro: string;
  };
  whyExists: string[];
  whatMakesDifferent: {
    title: string;
    subsections: Array<{
      title: string;
      content: string;
    }>;
  };
  howItWorks: {
    intro: string;
    points: string[];
  };
  aboutMe: string[];
  professionalLinks: Array<{
    label: string;
    url: string;
  }>;
  status: string;
}

export const aboutContent: AboutContent = {
  identity: {
    projectName: "Between Stations",
    pageTitle: "About This Project",
    personalIntro: "I'm Sam — a senior software engineer interested in how complex systems behave when the data is incomplete. This project is an experiment in making infrastructure legible, even when \"real-time\" isn't perfectly real."
  },
  whyExists: [
    "Most transit apps show you a dot and pretend it's exact.",
    "In reality, location data is delayed, degraded, or missing entirely. This project explores how to present \"best known state\" honestly — without breaking usability."
  ],
  whatMakesDifferent: {
    title: "What makes this different",
    subsections: [
      {
        title: "Estimation, not pretending",
        content: "Every position is labeled with its confidence level. When we're guessing, we say so."
      },
      {
        title: "Confidence is part of the UI",
        content: "Visual design communicates uncertainty. Low-confidence estimates pulse gently. High-confidence positions are solid."
      },
      {
        title: "Continuity over precision",
        content: "A train that was at Station A five minutes ago is probably between A and B now. The system infers likely state from partial evidence."
      },
      {
        title: "Designed to degrade gracefully",
        content: "When real-time feeds fail, schedule-based estimation continues. When schedules are wrong, visual indicators reflect the uncertainty."
      }
    ]
  },
  howItWorks: {
    intro: "At a high level, the system:",
    points: [
      "Collects signals from multiple sources",
      "Treats each signal as evidence, not truth",
      "Infers the most likely current state",
      "Communicates both location and confidence"
    ]
  },
  aboutMe: [
    "I like building tools that sit somewhere between infrastructure and interface — things that help people understand what's happening, even when the answer is \"we're not fully sure.\""
  ],
  professionalLinks: [
    {
      label: "GitHub",
      url: "https://github.com/samhilll"
    },
    {
      label: "LinkedIn",
      url: "https://linkedin.com/in/samhilll"
    }
  ],
  status: "This project is exploratory. Data may be delayed or estimated. Built independently."
};

