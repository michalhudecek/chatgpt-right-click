# ChatGPT Right Click VS Code Extension

## Overview
ChatGPT Right Click is a Visual Studio Code extension that allows you to quickly access ChatGPT features directly from the editor's right-click context menu. This extension streamlines your workflow by providing instant AI-powered assistance for code explanations, refactoring, documentation, and more.

## Features
- **Right-click context menu integration**: Access ChatGPT actions directly from the editor.
- **Code explanation**: Get instant explanations for selected code.
- **Refactoring suggestions**: Receive AI-powered refactoring ideas.
- **Documentation generation**: Automatically generate documentation for your code.
- **Custom prompts**: Send your own prompts to ChatGPT for flexible assistance.
- **Per-prompt model selection**: Choose or enter the OpenAI model for each prompt, or use your default setting.

## Getting Started
1. **Install the extension**
   - Download and install the `.vsix` file from the [Releases](#) or the VS Code Marketplace.
2. **Reload VS Code**
   - After installation, reload or restart VS Code to activate the extension.
3. **Usage**
   - Right-click on any code selection in the editor.
   - Choose a ChatGPT action from the context menu.
   - After picking a prompt, you can enter or change the model for this prompt (defaults to your settings value).
   - View the AI response in the editor or a dedicated panel.

## Requirements
- Visual Studio Code 1.60.0 or higher
- Internet connection (for ChatGPT API access)

## Extension Settings

This extension provides the following settings:
- `chatgpt-right-click.openaiApiKey`: Set your OpenAI API key.
- `chatgpt-right-click.model`: Default ChatGPT model to use (can be changed per prompt).
- `chatgpt-right-click.enableWebsearch`: Enable websearch for each prompt. If true, websearch will be used for every prompt unless disabled.

## Known Issues
- Some features may require a valid OpenAI API key.
- Large code selections may result in slower responses.

## Release Notes
### 0.0.1
- Initial release with right-click context menu integration and basic ChatGPT actions.

## Contributing

Contributions are welcome! Please open issues or pull requests on the [GitHub repository](https://github.com/MichalHudecek/chatgpt-right-click).


## License
[MIT](https://github.com/MichalHudecek/chatgpt-right-click/blob/main/LICENSE)

## Rebuilding the package for debugging
`yarn run compile`

Press F5 in VS Code to launch debugging.

## Rebuilding the package for publishing

```
npm ci
npm run compile
npx @vscode/vsce package
```