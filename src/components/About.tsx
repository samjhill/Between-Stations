import { aboutContent } from '../config/aboutContent';
import './About.css';

export default function About() {
  return (
    <div className="about-page">
      <div className="about-container">
        {/* Header section - Identity */}
        <header className="about-header">
          <h1 className="about-project-name">{aboutContent.identity.projectName}</h1>
          <h2 className="about-page-title">{aboutContent.identity.pageTitle}</h2>
          <p className="about-personal-intro">{aboutContent.identity.personalIntro}</p>
        </header>

        {/* Why this project exists */}
        <section className="about-section">
          {aboutContent.whyExists.map((paragraph, index) => (
            <p key={index} className="about-paragraph">
              {paragraph}
            </p>
          ))}
        </section>

        {/* What makes this different */}
        <section className="about-section">
          <h3 className="about-section-title">{aboutContent.whatMakesDifferent.title}</h3>
          {aboutContent.whatMakesDifferent.subsections.map((subsection, index) => (
            <div key={index} className="about-subsection">
              <h4 className="about-subsection-title">{subsection.title}</h4>
              <p className="about-subsection-content">{subsection.content}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="about-section">
          <h3 className="about-section-title">How it works</h3>
          <p className="about-paragraph">{aboutContent.howItWorks.intro}</p>
          <ul className="about-list">
            {aboutContent.howItWorks.points.map((point, index) => (
              <li key={index} className="about-list-item">{point}</li>
            ))}
          </ul>
        </section>

        {/* About me */}
        <section className="about-section">
          {aboutContent.aboutMe.map((paragraph, index) => (
            <p key={index} className="about-paragraph">
              {paragraph}
            </p>
          ))}
        </section>

        {/* Professional links */}
        <section className="about-section about-links">
          <p className="about-links-intro">
            If you're interested in the ideas behind this project, you can find more of my work here:
          </p>
          <ul className="about-links-list">
            {aboutContent.professionalLinks.map((link, index) => (
              <li key={index}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-link"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Project status & disclaimer */}
        <footer className="about-footer">
          <p className="about-status">{aboutContent.status}</p>
        </footer>

      </div>
    </div>
  );
}

