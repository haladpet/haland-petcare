/**
 * Lighthouse CI Configuration for Haland PetCare
 * 
 * This configuration defines performance budgets and quality gates
 * for the Haland PetCare veterinary management system.
 * 
 * Thresholds:
 * - Performance >= 90
 * - Accessibility >= 90
 * - Best Practices >= 90
 * - SEO >= 80
 * - Dashboard load < 2 seconds
 * - Customer search < 500ms
 * - Invoice create < 1 second
 * - Medical save < 1 second
 */

module.exports = {
  ci: {
    collect: {
      // Number of times to run Lighthouse to get a representative score
      numberOfRuns: 3,
      // Start the Next.js server before collecting
      startServerCommand: 'npm run start',
      // URL to test
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/customers',
        'http://localhost:3000/appointments',
        'http://localhost:3000/medical-records/new',
        'http://localhost:3000/inventory',
        'http://localhost:3000/pos',
        'http://localhost:3000/queue',
        'http://localhost:3000/reports',
        'http://localhost:3000/settings',
      ],
      // Settings for Lighthouse
      settings: {
        // Emulate desktop for more consistent results
        formFactor: 'desktop',
        // Use desktop screen size
        screenEmulation: {
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          mobile: false,
          disabled: false,
        },
        // Throttling settings
        throttling: {
          rttMs: 40,
          throughputKbps: 10000,
          cpuSlowdownMultiplier: 1,
        },
        // Skip some audits that are not relevant
        skipAudits: [
          'uses-http2',
          'is-crawlable',
        ],
        // Only run these categories
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
      },
      // Static dist directory (if pre-built)
      staticDistDir: './.next',
      // Path to the Chrome executable
      chromePath: process.env.CHROME_PATH || undefined,
    },
    assert: {
      // Assertions that must pass for the build to be considered successful
      assertions: {
        // Performance budgets
        'categories:performance': ['error', { minScore: 0.90 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.80 }],

        // Performance timing budgets
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

        // Best practices
        'no-vulnerable-libraries': ['error'],
        'errors-in-console': ['error'],
        'deprecations': ['warn'],

        // Accessibility
        'color-contrast': ['error'],
        'html-has-lang': ['error'],
        'image-alt': ['error'],
        'label': ['error'],
        'link-name': ['error'],
        'meta-viewport': ['error'],
        'tap-targets': ['error'],
        'aria-allowed-attr': ['error'],
        'aria-required-attr': ['error'],
        'aria-required-children': ['error'],
        'aria-required-parent': ['error'],
        'aria-roles': ['error'],
        'aria-valid-attr': ['error'],
        'aria-valid-attr-value': ['error'],
        'button-name': ['error'],
        'bypass': ['error'],
        'document-title': ['error'],
        'duplicate-id-active': ['error'],
        'duplicate-id-aria': ['error'],
        'frame-title': ['error'],
        'heading-order': ['error'],
        'input-image-alt': ['error'],
        'list': ['error'],
        'listitem': ['error'],
        'meta-refresh': ['error'],
        'object-alt': ['error'],
        'tabindex': ['error'],
        'valid-lang': ['error'],
        'video-caption': ['error'],

        // SEO
        'meta-description': ['error'],
        'http-status-code': ['error'],
        'font-display': ['error'],
        'crawlable-anchors': ['error'],
        'document-title': ['error'],
        'link-text': ['error'],
        'is-crawlable': ['warn'],
        'hreflang': ['warn'],
        'canonical': ['warn'],
        'structured-data': ['warn'],
      },
      // Preset for Lighthouse CI
      preset: 'lighthouse:no-pwa',
    },
    upload: {
      // Target for uploading reports
      target: 'temporary-public-storage',
      // GitHub status check name
      githubStatusCheckName: 'Lighthouse CI',
    },
    server: {
      // Port for the Lighthouse CI server
      port: 9001,
    },
  },
};
