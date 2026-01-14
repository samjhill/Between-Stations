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
    personalIntro: "I'm Sam, a senior software engineer interested in how complex systems behave when the data is incomplete. This project is an experiment in making infrastructure legible, even when \"real-time\" isn't perfectly real."
  },
  whyExists: [
    "Most transit apps show you a dot and pretend it's exact. In reality, location data is delayed, degraded, or missing entirely. This project explores how to present \"best known state\" honestly, without breaking usability."
  ],
  whatMakesDifferent: {
    title: "What makes this different",
    subsections: [
      {
        title: "Honest uncertainty",
        content: "Every position shows its confidence level. When we're estimating from schedules, we say so. Visual design communicates uncertainty: low-confidence estimates pulse gently, high-confidence positions are solid."
      },
      {
        title: "Multiple data sources",
        content: "Combines real-time GPS, station arrival boards, and official timetables (774 trips across 155 stations) to build the best picture possible. When real-time feeds fail, schedule-based estimation continues."
      },
      {
        title: "Smart inference",
        content: "Infers likely state from partial evidence. A train that was at Station A five minutes ago is probably between A and B now. The system prioritizes evidence: GPS > Station reports > Schedules > Unknown."
      }
    ]
  },
  howItWorks: {
    intro: "The system:",
    points: [
      "Collects signals from multiple sources (real-time API, station boards, PDF timetables)",
      "Treats each signal as evidence, not absolute truth",
      "Infers the most likely current state using confidence-weighted fusion",
      "Communicates both location and confidence through visual design"
    ]
  },
  aboutMe: [
    "I like building tools that sit somewhere between infrastructure and interface, things that help people understand what's happening, even when the answer is \"we're not fully sure.\""
  ],
  professionalLinks: [
    {
      label: "GitHub",
      url: "https://github.com/samjhill"
    },
    {
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/sam-hill-a9283442/"
    }
  ],
  status: "This project is exploratory. Data may be delayed or estimated. Built independently."
};

