export type Category =
  'All work' | 'Security engineering' | 'Open source' | 'Side projects'
export interface Project {
  id: string
  title: string
  subtitle: string
  category: Exclude<Category, 'All work'>
  tags: string[]
  artwork:
    'terminal' | 'apple' | 'radar' | 'database' | 'handheld' | 'dual-screen'
  status?: 'Work in progress'
  detail: string
  outcomeTitle: string
  outcome: string
  context: string
  /** Public source repository. */
  url?: string
  /** Live, publicly reachable deployment. */
  liveUrl?: string
  /** Slug of a published post in content/posts describing the project. */
  article?: string
}

// Content is the CMS. Edit this file in a pull request; merge to master to publish.
// Career facts and project summaries are maintained alongside the generated CV.
export const portfolio = {
  name: 'Anthony Viriya',
  handle: 'avltree9798',
  role: 'Security Engineer',
  location: 'London, UK',
  email: 'me@avltree9798.co.uk',
  github: 'https://github.com/avltree9798',
  linkedin: 'https://www.linkedin.com/in/anthony-viriya/',
  aviation: {
    aircraft: 'Airbus A350-1000',
    aircraftCode: 'A35K',
    airlines: [
      { code: 'BA', name: 'British Airways' },
      { code: 'JAL', name: 'Japan Airlines' },
    ],
  },
  projects: [
    {
      id: 'security-automation',
      title: 'SaaS log pipeline',
      subtitle:
        'Security log ingestion and enrichment for SaaS apps at Cloudflare.',
      category: 'Security engineering',
      tags: ['JavaScript', 'Cloudflare', 'Terraform'],
      artwork: 'terminal',
      context: 'Cloudflare · Internal project',
      detail:
        'Built a JavaScript logging ingestion and enrichment pipeline for multiple SaaS applications, with infrastructure managed through Terraform.',
      outcomeTitle: 'Impact',
      outcome:
        'Logging processing time reduced from 2 hours to under 5 minutes.',
    },
    {
      id: 'airtrace',
      title: 'Airtrace',
      subtitle: 'A live flight tracker running on Cloudflare Workers.',
      category: 'Side projects',
      tags: ['TypeScript', 'Vue', 'Cloudflare Workers'],
      artwork: 'radar',
      context: 'Personal project · Live flight radar',
      detail:
        'A flight radar built with Vue, Leaflet and a Cloudflare Worker. One shared Durable Object caches community ADS-B feeds, serialises upstream requests and fails over between three providers, so every visitor shares a free API plan. Includes plane-spotting tools, an airport explorer, replay and an installable offline shell.',
      outcomeTitle: 'Engineering highlights',
      outcome:
        'Markers ease between measured positions and never extrapolate. Route evidence is graded rather than presented as a destination, parallel runways are told apart by cross-track distance, and a missing value stays unknown instead of becoming zero. 137 automated tests and browser checks against the live site.',
      liveUrl: 'https://adsb.avltree9798.co.uk',
      article: 'building-airtrace',
    },
    {
      id: 'pyloquent',
      title: 'Pyloquent',
      subtitle: 'An async Python ORM inspired by Laravel Eloquent.',
      category: 'Open source',
      tags: ['Python', 'Pydantic', 'Cloudflare D1'],
      artwork: 'database',
      context: 'Open-source Python library',
      detail:
        'An asynchronous ORM inspired by Laravel Eloquent, bringing Pydantic models, relationships, query building and migrations together. Includes drivers for SQLite, PostgreSQL, MySQL and Cloudflare D1.',
      outcomeTitle: 'What it does',
      outcome:
        'Define Pydantic models, query related records and manage schema changes through one Python API. Transaction tests check that concurrent requests keep their database connections separate.',
      url: 'https://github.com/avltree9798/pyloquent',
    },
    {
      id: 'dylib-hijack-scanner',
      title: 'dylib_hijack_scanner',
      subtitle: 'Finds libraries that macOS apps try to load but are missing.',
      category: 'Open source',
      tags: ['Python', 'Mach-O', 'macOS security'],
      artwork: 'radar',
      context: 'Open-source security research tool',
      detail:
        'A Python scanner that examines Mach-O dependencies and library search paths to identify missing library candidates. Exports findings as JSON for further investigation.',
      outcomeTitle: 'Reading the results',
      outcome:
        'Reports list missing library candidates for manual investigation. A missing library can suggest a hijack opportunity, but does not establish exploitability on its own.',
      url: 'https://github.com/avltree9798/dylib_hijack_scanner',
    },
    {
      id: 'gmboy',
      title: 'gmboy',
      subtitle: 'A Game Boy emulator in C, with an article series.',
      category: 'Open source',
      tags: ['C', 'SDL2', 'Emulation'],
      artwork: 'handheld',
      context: 'Educational Game Boy emulator',
      detail:
        'A Game Boy emulator written in C with SDL2, exploring how CPU instruction execution, memory mapping, graphics, timers, audio and input work together. The accompanying blog series introduces these systems to software engineers.',
      outcomeTitle: 'Inside the emulator',
      outcome:
        'An eight-part article series walks through the CPU, memory, graphics, audio and testing, with links to the code.',
      url: 'https://github.com/avltree9798/gmboy',
    },
    {
      id: 'clamshell',
      title: 'Clamshell',
      subtitle:
        'An experimental Nintendo DS and 3DS emulator for iPhone and iPad.',
      category: 'Open source',
      tags: ['Swift', 'SwiftUI', 'ARM'],
      artwork: 'dual-screen',
      status: 'Work in progress',
      context: 'Experimental Nintendo DS and 3DS emulator',
      detail:
        'An emulator project combining ARM interpretation and console hardware modelling with a SwiftUI interface for iPhone and iPad. The architecture separates the emulator cores from presentation, audio and input.',
      outcomeTitle: 'Development status',
      outcome:
        'An experimental emulator in active development. Synthetic ROMs and subsystem tests exercise CPU and hardware behaviour; game compatibility is still being developed.',
      url: 'https://github.com/avltree9798/clamshell',
    },
    {
      id: 'isjailbroken',
      url: 'https://github.com/avltree9798/isJailbroken',
      title: 'isJailbroken',
      subtitle: 'Jailbreak detection for iOS apps.',
      category: 'Open source',
      tags: ['Objective-C', 'iOS', 'Mobile security'],
      artwork: 'apple',
      context: 'Open-source project',
      detail:
        'An Objective-C library that lets an iOS app detect a jailbroken device and protect sensitive features.',
      outcomeTitle: 'In use',
      outcome:
        'Adopted by more than 15 production iOS applications in Indonesia and Singapore.',
    },
    {
      id: 'watcher',
      url: 'https://github.com/avltree9798/watcher',
      title: 'watcher',
      subtitle: 'Monitors file and process events on macOS.',
      category: 'Open source',
      tags: ['macOS', 'Endpoint Security', 'Monitoring'],
      artwork: 'radar',
      context: 'Open-source project',
      detail:
        'Uses Apple’s Endpoint Security framework to monitor and control system events on macOS.',
      outcomeTitle: 'What it records',
      outcome:
        'File access and process execution events, which other security tools can inspect.',
    },
  ] satisfies Project[],
  experience: [
    {
      company: 'Cloudflare',
      role: 'Security Engineer',
      period: 'Feb 2024 to present',
      summary:
        'Security delivery and automation. Building controls across endpoints, cloud infrastructure and incident response.',
      accent: 'coral',
    },
    {
      company: 'Yelp',
      role: 'Senior Security Incident & Detection Engineer',
      period: 'Nov 2021 to Feb 2024',
      summary:
        'Apple platform security, automated malware analysis and detection engineering.',
      accent: 'rose',
    },
    {
      company: 'Gopay',
      role: 'Senior Product Security Engineer',
      period: 'Feb 2021 to Aug 2021',
      summary:
        'iOS application security, secure development workflows and bug bounty ownership.',
      accent: 'mint',
    },
    {
      company: 'ITSEC Asia',
      role: 'Penetration Tester Consultant',
      period: 'Jan 2019 to Jan 2021',
      summary:
        'Mobile application assessments, vulnerability research and API security testing.',
      accent: 'blue',
    },
  ],
  certifications: [
    'GIAC Machine Learning Engineer',
    'Offensive Security macOS Researcher',
    'CREST Registered Penetration Tester',
    'CREST Practitioner Security Analyst',
  ],
  skills: [
    'Python',
    'Swift',
    'Objective-C',
    'JavaScript',
    'Frida',
    'Burp Suite',
    'Terraform',
    'GCP',
    'AWS',
    'Docker',
    'Kubernetes',
  ],
}
