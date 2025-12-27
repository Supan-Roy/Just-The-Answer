# Just The Answer

A powerful Chrome extension that extracts and copies clean, meaningful answers from AI chatbots, perfectly formatted for Word, Google Docs, and other applications.

## Features

✨ **Smart Answer Extraction**
- Automatically detects and isolates answer content from ChatGPT, Gemini, Claude, Copilot, and more
- Removes greeting text, prompts, and trailing sections
- Preserves formatting for seamless pasting in Word and Google Docs

📋 **Three Copy Modes**
1. **Copy Main Answer** - Get the entire response with one click
2. **Copy by Block** - Select and copy specific paragraphs (hover to see)
3. **Copy Equation** - Isolate and copy mathematical equations with LaTeX support

🧮 **Equation Support**
- Detects KaTeX and MathJax equations
- Extracts LaTeX code for math-specific tools
- Preserves equation formatting for Word documents

🎯 **Multi-Platform Support**
- ChatGPT
- Google Gemini
- Microsoft Copilot
- DeepSeek

⚙️ **Easy Control**
- Toggle extension on/off from the popup menu
- Smooth, non-intrusive button design
- One-click access without installing extra tools

## Installation

### From Chrome Web Store
1. Visit [Chrome Web Store](https://chrome.google.com/webstore)
2. Search for "Just The Answer"
3. Click "Add to Chrome"
4. Confirm the permissions

### Manual Installation (Developer Mode)
1. Clone or download this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder

## How to Use

### Copy Main Answer
1. Open any supported AI chatbot
2. Get an answer
3. Click the "Copy Main Answer" button (appears at the top of responses)
4. The answer is copied to your clipboard
5. Paste directly into Word, Google Docs, or any text editor

### Copy by Block
1. Hover over any section of the answer
2. Click the "Copy" button that appears
3. The specific block is copied to your clipboard
4. Useful for selective copying of paragraphs

### Copy Equation
1. When an equation is detected in the response
2. Click the "📐 Copy Equation" button
3. The equation is copied (as LaTeX for math tools, or as HTML for Word)
4. Paste into your math editor or document

### Toggle Extension
1. Click the extension icon in your toolbar
2. Use the toggle switch to enable/disable
3. When disabled, no buttons appear on AI chat sites

## Features in Detail

### Smart Delimiter Detection
The extension uses visual cues to identify answer boundaries:
- Horizontal dividers
- Content section borders
- Paragraph breaks and spacing

### Clean Formatting
- Removes extension UI elements before copying
- Preserves bold, italic, links, and code formatting
- Maintains proper spacing and line breaks
- Compatible with "Keep Source Formatting" in Word

### Mathematical Content
- Automatically detects KaTeX and MathJax rendering
- Extracts underlying LaTeX code
- Supports inline and display equations
- No garbled accessibility text in Word paste

### Performance Optimized
- Lightweight observer system (200ms debounce)
- Auto-disconnect after content stabilizes
- No lag on chatbot pages
- Minimal CPU/memory usage

## Supported AI Platforms

| Platform | Support | Block Copy | Equations |
|----------|---------|-----------|-----------|
| ChatGPT | ✅ | ✅ | ✅ |
| Google Gemini | ✅ | ✅ | ✅ |
| Microsoft Copilot | ✅ | ✅ | ✅ |
| DeepSeek | ✅ | ✅ | ✅ |

## Settings

The extension stores only one setting locally:
- **Extension enabled state** - Saved in Chrome local storage, not transmitted anywhere

No user data, analytics, or tracking is collected.

## Troubleshooting

### Copy button not appearing
1. Refresh the page
2. Make sure the extension is enabled (check popup)
3. Wait a moment for the response to fully render
4. Try disabling and re-enabling the extension

### Equation showing as garbage text in Word
1. Use "Copy Equation" button for math content
2. Paste with "Keep Source Formatting" option
3. Avoid pasting with "Merge Formatting" in Word

### Extension not working on certain websites
1. Some AI platforms may have updates that change their HTML structure
2. Report the issue on GitHub with screenshots
3. The extension will be updated to support new platforms

## Performance Tips

- The extension uses efficient DOM observation (200ms debounce)
- Copy operations are instant once button is clicked
- Disable the extension when not actively using AI chats to free resources
- Works smoothly alongside other extensions

## Developer Information

**Author:** Supan Roy  
**GitHub:** [Supan-Roy/Just-The-Answer](https://github.com/Supan-Roy/Just-The-Answer)  
**License:** MIT  

## Feedback & Support

- 📧 **Email:** contact@supanroy.com
- 🐛 **Report Issues:** [GitHub Issues](https://github.com/Supan-Roy/Just-The-Answer/issues)
- 💼 **LinkedIn:** [linkedin.com/in/supanroy](https://linkedin.com/in/supanroy)

## Privacy Policy

See [PRIVACY.md](PRIVACY.md) for details on data handling and permissions.

## License

MIT License - Feel free to use, modify, and distribute this extension.

---

**Enjoy clean, formatted answers from your AI chats!** ✨
