# Saidai - Custom Static Site Generator

This is the custom static site generator powering [MaxwellCofie.com](https://maxwellcofie.com). It is a lightweight, purpose-built tool designed to convert Markdown content into a performant, static personal website.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v14 or later recommended)
-   npm

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

## 🛠 Workflow

The project is designed around a simple "Author -> Build -> Deploy" workflow.

### 1. Creating a New Post

To create a new blog post, use the automated CLI tool. This ensures the correct folder structure and Front Matter formatting.

```bash
npm run new-post
```

Follow the interactive prompts:
1.  **Post Title**: Enter the full title of your post.
2.  **Description**: Enter a short summary (used for SEO and previews).
3.  **Category**: Specify the post category (defaults to `Thought`). This determines the tag color.

The script will automatically:
-   Generate a slug from your title.
-   Create a new Markdown file in `content/posts/[slug].md`.
-   Pre-fill the file with the required Front Matter (Title, Date, ISO Date, Description, Category).

### Content Categories & Tags

Posts are automatically tagged based on the `category` field in the Front Matter. The following categories feature unique color-coded badges:

-   **Community** (Amber)
-   **Engineering** (Blue)
-   **Design** (Purple)
-   **Product** (Green)
-   **Thoughts** (Pink/Rose)
-   **Tutorial** (Teal)
-   **News** (Indigo)
-   **Business** (Slate Gray)
-   **Technology** (Turquoise)
-   **Travel** (Yellow)
-   **Africa** (Earth)
-   **Lifestyle** (Sky Blue)
-   *Others* (Gray default)

### 2. Writing Content

Navigate to `content/posts/` and open your newly created file. Write your post using standard Markdown. The generator supports:
-   **Code Highlighting**: Automatic syntax highlighting via `highlight.js`.
-   **Video Embeds**: Use standard Markdown image syntax (`![alt](video.mp4)`) to embed standard video formats.
-   **Front Matter**: Metadata configuration at the top of the file.

### 3. Building the Site

Once you are finished writing, rebuild the site to generate the HTML.

```bash
npm run build
```

This script performs the following actions:
-   **Compiles Posts**: Converts all `.md` files in `content/posts/` to HTML.
-   **Generates Pages**: Creates directory-based routes (e.g., `posts/my-slug/index.html`) for clean URLs.
-   **Updates Indices**:
    -   Updates the **Writing** page (`writing/index.html`) with the full list of posts.
    -   Updates the **Homepage** (`index.html`) to feature the 3 most recent posts.
    -   `rss.xml` for blog subscribers.
    -   `sitemap.xml` for SEO.

## ✨ Features

### Multimedia Support
The generator extends the default Markdown renderer. You can embed videos directly using standard image syntax. If the file extension is `.mp4`, `.webm`, or `.mov`, it will automatically render as a responsive HTML5 video player.

### Reader Mode
Blog posts come equipped with tools for long-form reading:
-   **Progress Bar**: Visual indicator of reading progress at the top of the viewport.
-   **Font Toggle**: Switch between **Inter** (Sans-Serif) and **Newsreader** (Serif) for optimal reading comfort.
-   **Back to Top**: Quick navigation control.

### Localization (i18n)
The site supports client-side localization for **English**, **French**, and **Spanish**. Text replacement is handled via `locale.js` based on `data-i18n` attributes.

### Theming
-   **Dark Mode**: Respects system preferences by default, with a manual toggle (sun/moon) saved to `localStorage`.
-   **Design System**: Built on a "Swiss/Ultra-Minimal" aesthetic with refined typography and strict spacing.

## 📂 Project Structure

-   `bin/`: Helper scripts (e.g., `new-post.js`) for CLI commands.
-   `content/posts/`: Source Markdown files for all blog posts.
-   `posts/`: **Generated** HTML output directory for individual posts.
-   `writing/`: Contains the blog index page.
-   `ventures/`: Static pages for the Ventures section.
-   `assets/`: Images, fonts, and other static resources.
-   `build.js`: The core logic for the static site generator.
-   `style.css`: Global stylesheet.

## 🔧 Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run build` | `node build.js` | Compiles the static site, updating all indices and generating new pages. |
| `npm run new-post` | `node bin/new-post.js` | Interactive CLI to scaffold a new blog post with correct metadata. |

## 📝 Tech Stack

-   **Node.js**: Runtime environment.
-   **Marked**: Markdown parser.
-   **Front-Matter**: Metadata parser for Markdown files.
-   **Highlight.js**: Syntax highlighting for code blocks.
