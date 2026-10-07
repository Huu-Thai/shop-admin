# Shop Admin documentation

Shop Admin is the back office for the **shop** headless commerce API. It ships as a Next.js 16
app you run next to the API. Browsers talk only to Shop Admin, which calls the API for them.

| I want to…                                   | Read                                             |
| -------------------------------------------- | ------------------------------------------------ |
| Install it and sign in for the first time    | [Install & configure](INSTALL.md)                |
| Put it on a server (Docker or Node)          | [Deploy & upgrade](DEPLOY.md)                    |
| Fix something that doesn't work              | [Troubleshooting](TROUBLESHOOTING.md)            |
| Change colours, logo, fonts or accent preset | [Theming](THEMING.md)                            |
| Know the design rules for sizes and layouts  | [Style guide](STYLE-GUIDE.md) and `/style-guide` |
| Add a screen, a menu item or a translation   | [Extending](EXTENDING.md)                        |
| Run the unit, browser and Lighthouse checks  | [Testing](TESTING.md)                            |
| Cut a release of a customised copy           | [Release checklist](RELEASE-CHECKLIST.md)        |

Also at the project root:

- `CHANGELOG.md`: what changed in each version.
- `LICENSE`: the Regular and Extended licence terms.
- `THIRD-PARTY-NOTICES.md`: the open-source packages bundled in the build.

## What you get

- **Every area of the shop API:**
  - orders, payments and shipping
  - catalog, pricing, tax and inventory
  - customers and marketing
  - content and merchandising
  - stores, access control, audit, jobs, webhooks and settings
- **Permission-aware screens.** Each admin sees and can change only what their role allows.
- **The Ink design system:**
  - base `#191919`
  - six accent presets
  - light and dark modes
  - WCAG 2.2 AA contrast checked by unit tests and by axe in the browser suite
- **English and Vietnamese**, with a pattern for adding languages.
- **A read-only demo mode** for showing the product publicly.
- **A secure gateway.** The browser never sees API tokens, and every change needs a same-origin
  request with the gateway header.

## Support

Before you contact support, check [Troubleshooting](TROUBLESHOOTING.md). Include in your message:

- the version from `package.json`
- the shop API version
- the exact message shown on screen or in the server log
