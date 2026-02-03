# NOTE: This repository is not in use anymore. Code/Content has now been moved to customer managed code/content repository.

# CME Group
All project code for cmegroup.com on AEM Edge Delivery Services

## Documentation

Before using the aem-boilerplate, we recommand you to go through the documentation on https://www.aem.live/docs/ and more specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)


## Plugins

Plugins in DA are now managed via Sheets (unlike config.json in the past). See https://da.live/config#/cmegroup/www/ for Library  and Plugin setup.

- For DA or local development, value of 'ref' for your plugin can be switched to local or branch-name for testing.
- To test in DA environment, you could use url like : https://da.live/edit?ref=local#/cmegroup/www/<your-page-name>

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template and add a mountpoint in the `fstab.yaml`
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `{repo}` directory in your favorite IDE and start coding :)
