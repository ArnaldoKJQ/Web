# Strategic Space

A static website for a Malaysian commercial and industrial real estate agency. Built with plain HTML, Tailwind CSS, and vanilla JavaScript — no build tools required. Deployed on GitHub Pages.

---

## Live Site

[https://arnaldokjq.github.io/Web/](https://arnaldokjq.github.io/Web/)

---

## Features

- **Property listings** for rent and for sale, loaded dynamically from a CSV file
- **Filterable pages** — dedicated `/for-rent.html` and `/for-sale.html` pages
- **Property detail modal** with image gallery, description, and features
- **Contact form** powered by Formspree (no backend needed)
- **Dark mode** toggle with preference saved to localStorage
- **Responsive design** — mobile menu, adaptive grid layouts
- **Featured properties** on the homepage controlled via the CSV

---

## Project Structure

```
/
├── index.html               # Main homepage
├── for-rent.html            # All rental properties
├── for-sale.html            # All properties for sale
├── styles/
│   └── styles.css           # Custom styles and dark mode overrides
├── scripts/
│   └── properties.js        # CSV loader, card renderer, modal logic, UI init
└── resource/
    ├── property-details.csv # Property data source
    ├── light.svg            # Favicon (light mode)
    ├── dark.svg             # Favicon (dark mode)
    └── properties/          # Property images (optional)
```

---

## Adding or Editing Properties

All property data lives in `resource/property-details.csv`. Each row is one property.

| Column | Description |
|---|---|
| `Name` | Property name |
| `Location` | Area / address |
| `Land size sqft` | Land size in sq ft |
| `Built up size sqft` | Built-up size in sq ft |
| `Status` | `Rent` or `Sale` |
| `Price` | Numeric price (e.g. `5000` for RM 5,000/mo) |
| `Type` | Property type (e.g. Warehouse, Factory, Shoplot) |
| `Description` | Full description shown in the modal |
| `Features` | Bullet points separated by `•` or newlines |
| `Image (Leave Blank)` | Semicolon-separated image filenames or URLs. Leave blank to use placeholders. |
| `Home Page` | Controls homepage visibility. Values: `Featured`, `Rent`, `Sale` (comma-separated) |

### Adding local images

Place image files in `resource/properties/` and reference them by filename in the CSV:

```
shah-alam-1.jpg;shah-alam-2.jpg
```

---

## Contact Form Setup (Formspree)

1. Sign up at [formspree.io](https://formspree.io)
2. Create a new form and copy your form ID
3. In `index.html`, update the form action:
   ```html
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
4. To redirect back after submission, add a hidden field inside the form:
   ```html
   <input type="hidden" name="_next" value="https://yourusername.github.io/" />
   ```
5. In your Formspree dashboard, add your GitHub Pages domain under **Allowed Origins**

---

## Deployment (GitHub Pages)

1. Push all files to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, root folder `/`
4. Your site will be live at `https://yourusername.github.io/repo-name`

> **Important:** Use relative paths throughout (no leading `/`). Use `resource/light.svg` not `/resource/light.svg`, otherwise assets will 404 on GitHub Pages.

---

## Tech Stack

| Tool | Usage |
|---|---|
| HTML5 | Page structure |
| [Tailwind CSS](https://tailwindcss.com) (CDN) | Styling and layout |
| [Font Awesome 6](https://fontawesome.com) (CDN) | Icons |
| Vanilla JavaScript | CSV parsing, dynamic rendering, dark mode |
| [Formspree](https://formspree.io) | Contact form email delivery |
| GitHub Pages | Static hosting |

---

## Dark Mode

Dark mode is on by default. Users can toggle it using the moon/sun icon in the navbar. The preference is saved in `localStorage` and persists across visits.

To change the default to light mode, find this line in `properties.js`:

```js
const savedTheme = localStorage.getItem("theme") || "dark";
```

Change `"dark"` to `"light"`.

---

© 2025 Strategic Space. All rights reserved.

This project and its contents are proprietary. No part of this codebase may be copied, modified, distributed, or reused without explicit written permission from the owner.
