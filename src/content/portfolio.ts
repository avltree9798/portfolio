import cv from './cv.json'

export type Category = 'All work' | 'Security engineering' | 'Open source'
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
  outcome: string
  context: string
  url?: string
}

// Content is the CMS. Edit this file in a pull request; merge to master to publish.
// Career facts and project summaries are maintained alongside the generated CV.
export const portfolio = {
  name: cv.name,
  handle: 'avltree9798',
  role: 'Security Engineer',
  location: 'London, UK',
  email: cv.email,
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
      title: 'Logging, without the lag.',
      subtitle:
        'A faster path from SaaS events to security insight at Cloudflare.',
      category: 'Security engineering',
      tags: ['JavaScript', 'Cloudflare', 'Terraform'],
      artwork: 'terminal',
      context: 'Cloudflare · Internal project',
      detail:
        'Built a JavaScript logging ingestion and enrichment pipeline for multiple SaaS applications, with infrastructure managed through Terraform.',
      outcome:
        'Logging processing time reduced from 2 hours to under 5 minutes.',
    },
    {
      id: 'pyloquent',
      title: 'Pyloquent',
      subtitle: 'An expressive Python interface to the database.',
      category: 'Open source',
      tags: ['Python', 'Pydantic', 'Cloudflare D1'],
      artwork: 'database',
      context: 'Open-source Python library',
      detail:
        'An asynchronous ORM inspired by Laravel Eloquent, bringing Pydantic models, relationships, query building and migrations together. Includes drivers for SQLite, PostgreSQL, MySQL and Cloudflare D1.',
      outcome:
        'Tests cover pooled transaction isolation and connection routing, alongside model operations and database relationships.',
      url: 'https://github.com/avltree9798/pyloquent',
    },
    {
      id: 'dylib-hijack-scanner',
      title: 'dylib_hijack_scanner',
      subtitle: 'Following the paths a macOS library loader takes.',
      category: 'Open source',
      tags: ['Python', 'Mach-O', 'macOS security'],
      artwork: 'radar',
      context: 'Open-source security research tool',
      detail:
        'A Python scanner that examines Mach-O dependencies and library search paths to identify missing library candidates. Exports findings as JSON for further investigation.',
      outcome:
        'Makes potential dynamic library hijack opportunities easier to investigate. Findings are candidates for review, rather than proof of exploitability.',
      url: 'https://github.com/avltree9798/dylib_hijack_scanner',
    },
    {
      id: 'gmboy',
      title: 'gmboy',
      subtitle: 'Learning systems engineering, one instruction at a time.',
      category: 'Open source',
      tags: ['C', 'SDL2', 'Emulation'],
      artwork: 'handheld',
      context: 'Educational Game Boy emulator',
      detail:
        'A Game Boy emulator written in C with SDL2, exploring how CPU instruction execution, memory mapping, graphics, timers, audio and input work together. The accompanying blog series introduces these systems to software engineers.',
      outcome:
        'A practical route into systems engineering, with implementation trade-offs and current limitations explained in the article series.',
      url: 'https://github.com/avltree9798/gmboy',
    },
    {
      id: 'clamshell',
      title: 'Clamshell',
      subtitle: 'Two screens. A deeper dive into Nintendo hardware.',
      category: 'Open source',
      tags: ['Swift', 'SwiftUI', 'ARM'],
      artwork: 'dual-screen',
      status: 'Work in progress',
      context: 'Experimental Nintendo DS and 3DS emulator',
      detail:
        'An emulator project combining ARM interpretation and console hardware modelling with a SwiftUI interface for iPhone and iPad. The architecture separates the emulator cores from presentation, audio and input.',
      outcome:
        'Synthetic ROM and subsystem tests exercise CPU and hardware behaviour. Compatibility remains under development.',
      url: 'https://github.com/avltree9798/clamshell',
    },
    {
      id: 'isjailbroken',
      url: 'https://github.com/avltree9798/isJailbroken',
      title: 'isJailbroken',
      subtitle: 'A closer look beneath the surface of iOS.',
      category: 'Open source',
      tags: ['Objective-C', 'iOS', 'Mobile security'],
      artwork: 'apple',
      context: 'Open-source project',
      detail:
        'An Objective-C jailbreak detection library for iOS applications. Designed to help applications identify jailbroken devices and protect sensitive functionality from unauthorised access.',
      outcome:
        'Adopted by more than 15 production iOS applications in Indonesia and Singapore.',
    },
    {
      id: 'watcher',
      url: 'https://github.com/avltree9798/watcher',
      title: 'watcher',
      subtitle: 'Making the invisible visible on macOS.',
      category: 'Open source',
      tags: ['macOS', 'Endpoint Security', 'Monitoring'],
      artwork: 'radar',
      context: 'Open-source project',
      detail:
        'An open-source implementation of Apple’s Endpoint Security Framework for monitoring and controlling system events on macOS. Provides real-time visibility into file access and process execution.',
      outcome:
        'Visibility into the system events that matter for endpoint security.',
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
