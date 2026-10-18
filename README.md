# Saidai - Custom Static Site Generator

This is the custom static site generator powering [MaxwellCofie.com](https://maxwellcofie.com). It is a lightweight, purpose-built tool designed to convert Markdown content into a performant, static personal website.

## 🚀 Getting Started

### Prerequisites

-   Node.js 20 or later (the version CI uses)
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
-   **Shares Page Chrome**: Writes the same nav and footer into every hand-written page, and pre-renders the project lists on `work/index.html` from `data.js` and `locale.js`.
-   **Optimizes Post Images**: Cloudinary images get a `srcset` of 640/960/1280px copies in WebP/AVIF, plus `width`/`height` so the page doesn't jump while they load. Sizes come from `content/image-sizes.json`, which `bin/image-sizes.js` fills in for new images at the start of every build (commit it). The first image in a post loads eagerly; the rest lazy-load.
-   **Packages the Site**: Copies only the files the live site needs into `dist/` (see `bin/package-site.js`) and fails if any page links to a local file that is missing. Shared CSS/JS links get a `?v=<content hash>` so every page shares one cached copy. Only `dist/` is deployed.

Generated-content source of truth:

- Edit posts in `content/posts/`; `posts/[slug]/index.html` and `writing/index.html` are build output.
- The homepage writing list is replaced from its `WRITING_LIST_START` / `WRITING_LIST_END` markers.
- The nav and footer on hand-written pages are replaced between `SITE_NAV_*` / `SITE_FOOTER_*` markers; edit `renderSiteNav()` / `renderSiteFooter()` in `build.js`, not the pages.
- The project lists on the Work page are replaced between `WORKS_LIST_*` / `INITIATIVES_LIST_*` markers; edit `data.js` and `locale.js`.
- New files the site needs (a script, an image folder, a new page) must be added to the allowlist in `bin/package-site.js`, or they won't be deployed.
- `search.json`, `rss.xml`, and `sitemap.xml` are rebuilt from the Markdown posts.
- The build validates required post metadata and removes stale post HTML carrying the generator marker. Keep non-generated assets in `posts/` folders separate from `index.html`.

### Page titles and sharing previews

Edit titles, descriptions, and canonical paths for the main pages in `lib/metadata.js`.
Article metadata comes from each post's `title`, `description`, `isoDate`, and optional `author` fields.
An optional `image` (an absolute HTTPS URL or a path relative to the site root) and `imageAlt` set a custom article sharing cover; otherwise, the site uses `assets/images/maxwell-cofie-social-red.jpg`, a red portrait card with white lettering styled after the site's Mansalva and Inter typefaces, Maxwell's name, title, and website. Both use large Twitter cards. The original portrait remains the Person structured-data image. See `docs/social-preview.md` for the image generation prompts.

Run `npm run build` after changing metadata. It updates canonical links, Open Graph and Twitter tags, and JSON-LD in both static and generated pages. The 404 page receives `noindex` metadata.
Run `npm test` to check metadata escaping, canonical links, preview defaults, and repeatable updates.

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

### Performance
-   Fonts (Inter, Mansalva, Newsreader, JetBrains Mono) are self-hosted in `assets/fonts/` and declared at the top of `style.css`; pages preload the Inter and Mansalva files (posts also preload Newsreader).
-   Local scripts use `defer`, so inline page scripts that need them must wait for `DOMContentLoaded`.
-   The homepage YouTube player loads only when the video is opened.

### Theming
-   **Dark Mode**: Respects system preferences by default, with a manual toggle (sun/moon) saved to `localStorage`.
-   **Design System**: Built on a "Swiss/Ultra-Minimal" aesthetic with refined typography and strict spacing.

## 📂 Project Structure

-   `bin/`: Helper scripts: `new-post.js` for new posts, `package-site.js` for building `dist/`.
-   `content/posts/`: Source Markdown files for all blog posts.
-   `posts/`: **Generated** HTML output directory for individual posts.
-   `writing/`: Contains the blog index page.
-   `ventures/`: Static pages for the Ventures section.
-   `assets/`: Images, fonts, and other static resources.
-   `build.js`: The core logic for the static site generator.
-   `style.css`: Global stylesheet.
-   `dist/`: **Generated** deployable site (git-ignored).

## 🔧 Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run build` | `node bin/image-sizes.js && node build.js && node bin/package-site.js` | Compiles the static site, updates all indices and pages, and packages the deployable site into `dist/`. |
| `npm run image-sizes` | `node bin/image-sizes.js` | Looks up dimensions for new post images (also runs as part of `build`). |
| `npm test` | `node --test test/*.test.js` | Runs the metadata tests. CI runs these before every deploy. |
| `npm run new-post` | `node bin/new-post.js` | Interactive CLI to scaffold a new blog post with correct metadata. |

## 📝 Tech Stack

-   **Node.js**: Runtime environment.
-   **Marked**: Markdown parser.
-   **Front-Matter**: Metadata parser for Markdown files.
-   **Highlight.js**: Syntax highlighting for code blocks.
