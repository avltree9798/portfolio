import cv from './cv.json'

export type Category = 'All work' | 'Security engineering' | 'Open source'
export interface Project {
  id: string
  title: string
  subtitle: string
  category: Exclude<Category, 'All work'>
  tags: string[]
  artwork: 'terminal' | 'apple' | 'radar'
  detail: string
  outcome: string
  context: string
  url?: string
}

// Content is the CMS. Edit this file in a pull request; merge to master to publish.
// Career facts reflect Anthony's CV, last updated July 2026.
export const portfolio = {
  name: cv.name,
  handle: 'avltree9798',
  role: 'Security Engineer',
  location: 'London, UK',
  email: cv.email,
  github: 'https://github.com/avltree9798',
  linkedin: 'https://www.linkedin.com/in/anthony-viriya/',
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
      id: 'isjailbroken',
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
      period: 'Feb 2024 — present',
      summary:
        'Security delivery and automation. Building controls across endpoints, cloud infrastructure and incident response.',
      accent: 'coral',
    },
    {
      company: 'Yelp',
      role: 'Senior Security Incident & Detection Engineer',
      period: 'Nov 2021 — Feb 2024',
      summary:
        'Apple platform security, automated malware analysis and detection engineering.',
      accent: 'rose',
    },
    {
      company: 'Gopay',
      role: 'Senior Product Security Engineer',
      period: 'Feb 2021 — Aug 2021',
      summary:
        'iOS application security, secure development workflows and bug bounty ownership.',
      accent: 'mint',
    },
    {
      company: 'ITSEC Asia',
      role: 'Penetration Tester Consultant',
      period: 'Jan 2019 — Jan 2021',
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
