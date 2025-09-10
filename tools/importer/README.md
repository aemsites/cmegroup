# CME Group Importer - README

A comprehensive content migration guide for transforming CME Group's legacy website content into AEM Edge Delivery Services (EDS) format, with specialized handling for authentication-protected content.


## Platform Foundation

Built on the official AEM EDS importer platform:
- **[AEM Importer UI](https://github.com/adobe/helix-importer-ui)** - Core importer platform and tools
- **[Importer Guidelines](https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md)** - Development standards and best practices  
- **[AEM.live Developer Documentation](https://www.aem.live/developer/importer)** - Complete platform documentation

## What's Included

### Core Components
- **Main Importer** (`importer.js`) - Primary content transformation engine
- **Course Processor** (`course-lesson.js`) - Educational content specialized handling
- **Event Processor** (`events.js`) - Event page transformation logic
- **Utility Library** (`utils.js`) - Shared transformation functions
- **Gated Content Handler** (`gated-content-node/`) - Authentication-aware content processing

## Setup and Configuration

### Prerequisites
- AEM CLI - Install the official Adobe AEM CLI tool
- Node.js Environment - Required for running the importer toolkit
- API Access - Credentials for CME Group's content management systems

### Platform Installation
```bash
# At the root of your AEM project
$ aem import

# With caching for improved performance
$ aem import --cache .cache/
```

### Environment Configuration (Gated Content Only)
Create a `.env` file under /gated-content-node for gated content API access: 


```bash
CME_SECURE_FGP=""
CME_USER_ID=""
CME_TOKEN=""
```

Note : Get these values from browser cookies or reach out to CME/Kopius team for details

### Project Structure
```
your-aem-project/
├── .env                          # Environment configuration
├── tools/importer/
│   ├── README.md                 # This documentation
│   ├── importer.js               # Main transformation engine
│   ├── course-lesson.js          # Educational content processor
│   ├── events.js                 # Event content processor
│   ├── utils.js                  # Shared utilities
│   └── gated-content-node/       # Authentication handler
└── helix-importer-ui/            # Platform UI (auto-installed)
```

## Development Guidelines

### Platform Best Practices
Follow the official [Importer Guidelines](https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md) for:

### Development Workflow
1. **Setup**: Use `aem import` to start the importer UI
2. **Develop**: Use Workbench mode for single-page testing
3. **Test**: Validate with various content types and gated scenarios
4. **Deploy**: Use Bulk mode for large-scale imports


#### Testing Gated Content
1. Use pages with `content-toggle` elements
2. Verify API endpoints are accessible
3. Check section metadata generation
4. Validate fragment URL detection
5. Test both authenticated and anonymous views

## Troubleshooting

### Debug Tips
- Check browser console for API fetch errors
- Verify DOM structure matches expected patterns
- Test fragment URLs directly
- Validate generated section metadata

