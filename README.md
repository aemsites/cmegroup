# CME Group
All project code for cmegroup.com on AEM Edge Delivery Services

## Environments
- Preview: https://main--www--cmegroup.aem.page/
- Live: https://main--www--cmegroup.aem.live/

## Documentation

Before using the aem-boilerplate, we recommand you to go through the documentation on https://www.aem.live/docs/ and more specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)


## Plugins

- For local development, sidekick plugins can be configured at /tools/sidekick/config.json
- For DA environments, sidekick plugins must be registered in the config bus using the Admin API. See [here](https://www.aem.live/docs/admin.html#schema/SidekickConfig) for more details.
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
