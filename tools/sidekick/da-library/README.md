# DA Library Plugin

## Overview

**da-library** is an interim solution for integrating and using legacy `.da/config.json` plugins within the new DA platform. This plugin allows you to fetch and render lists of items from JSON sources, and send formatted values back to the DA interface. It is designed to bridge the gap while migrating from the old plugin system to the new DA SDK-based approach.

## Purpose

- Provide compatibility for existing `.da/config.json` plugin data sources.
- Allow users to select and send formatted values (key, value) from JSON lists.
- Support flexible formatting via a URL parameter.

> NOTE: This plugin only supports key value json reponses.

## How It Works

- Fetches a JSON file from either:
  - **Relative paths**: DA Source API (e.g., `/docs/library/authors.json`)
  - **Full URLs**: Any external JSON API (e.g., `https://api.example.com/data/authors.json`)
- Renders the items as a selectable list in the UI.
- When an item is clicked, sends a value (based on the `format` parameter) back to the DA interface. The plugin does not auto-close.

### URL Types

- **Relative paths** (starting with `/`): Use authenticated DA Source API access
- **Full URLs** (starting with `http://` or `https://`): Use standard fetch requests

## Usage

### Configuration

> Site _CONFIG_ > _library_

| title | path | icon | ref | format | experience |
| ------- | --------------------------------------------------------------------------------------------------------- | - | - | - | - |
| `Name`  | `/tools/plugins/da-library/da-library.html?content=/path/to/file.json&format=%3ACONTENT%3A` |   |   |   |   |


### Basic URL (Relative Path)

```
da-library.html?content=/docs/library/authors.json
```

- This will fetch the authors list from the DA Source API and allow you to select and send the raw key value.

### Basic URL (Full URL)

```
da-library.html?content=https://api.example.com/data/authors.json
```

- This will fetch the authors list from any external JSON API and allow you to select and send the raw key value.

### Using the `format` Parameter

You can customize the value sent by providing a `format` parameter in the URL. Use the placeholder `CONTENT` to indicate where the item's key should be inserted. The special modes `HTML` and `CONTENT` are case-insensitive.

#### Example: Add a comma after each value `CONTENT,`

```
da-library.html?content=/docs/library/content-type.json&format=CONTENT%2C
```

#### Example: Custom attribute format `data-bi-bhvr = 'CONTENT'`

```
da-library.html?content=/docs/library/content-type.json&format=data-bi-bhvr%20%3D%20%27CONTENT%27
```

#### Example: Colon-wrapped format `:CONTENT:`

```
da-library.html?content=/docs/library/content-type.json&format=%3ACONTENT%3A
```

#### Example: Double curly braces format `{{CONTENT}}`

```
da-library.html?content=/docs/library/content-type.json&format=%7B%7BCONTENT%7D%7D
```


### Modes

- HTML mode (case-insensitive): `format=HTML`
  - Sends the item's `value` via the DA SDK's HTML method (no `CONTENT` replacement).
  - Use this when `value` is HTML you want inserted into the document.

- CONTENT mode (case-insensitive): `format=CONTENT`
  - Sends the item's `key` as plain text.

- Template mode: any other string containing `CONTENT`
  - Replaces `CONTENT` with the item's `key` and sends the result as text.

- Default (no `format`):
  - Sends the item's `key` as plain text.

### HTML Mode

If you have a key/value source where the `value` contains HTML you want to insert into the document, you can use `format=HTML`. In this mode, the plugin will send the item's `value` using the DA SDK's HTML sending method and will not apply `CONTENT` replacement.

Usage:

```
da-library.html?content=/docs/library/links.json&format=HTML
```

Given the following item:

```
{ "key": "internal-link", "value": "<a href=/link-internal title=link>Internal Link</a>" }
```

Clicking it will send the anchor HTML to the document via the DA SDK HTML API. For more on the DA App SDK and its HTML capabilities, see the official docs: https://docs.da.live/developers/guides/developing-apps-and-plugins

### Result

- Clicking an item will send the selected value (e.g., `data-bi-bhvr = 'news'`, or HTML in HTML mode) to the DA interface. The plugin remains open so you can insert multiple items.

### Display

- The list shows the item's `key` only (not the `value`), to avoid rendering HTML in the list UI.

## Limitations

- This is an interim solution and may be deprecated as the DA SDK and plugin system evolve.
- Only supports simple list selection and formatting.
- The placeholder for replacement is always `CONTENT` (case-sensitive).
*- Requires each item to include a `key` field.*
