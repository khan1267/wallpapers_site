# VividWall - Premium Local Wallpaper Hub

VividWall is a premium, high-performance desktop wallpaper application running locally on your system. It serves as a beautiful web interface to browse, search, upload, and download high-resolution wallpapers, saving all physical files and metadata directly inside `F:\Antigravity`.

## Key Features

- 🌌 **Premium Dark UI**: Built with a sleek HSL color scheme, custom typography, and modern glassmorphism panels.
- 📂 **Local Storage Integration**: All wallpaper images are stored in `F:\Antigravity\wallpapers\`, and metadata is managed in a local JSON database at `F:\Antigravity\data\database.json`.
- 🔍 **Real-time Search & Filter**: Instantly search by title or tags (with debouncing to prevent UI stutter) and filter by categories (Sci-Fi, Nature, Abstract, Minimalist, Space, etc.).
- 🚀 **Client-Side Image Inspection**: Automatically detects and extracts image dimensions (resolution) and file sizes on the client side during selection before upload.
- 📊 **Download Tracking**: Increments download counters on disk and triggers high-speed downloads via attachments.
- ⚡ **Rich Micro-animations**: Implements grid loading skeletons, hover effects, modal transitions, and dynamic Toast notifications.

---

## Directory Structure

```
F:\Antigravity\
├── data\
│   └── database.json          # Wallpaper metadata registry (JSON)
├── wallpapers\                # Repository of stored wallpaper images
├── public\                    # Web App static files
│   ├── index.html             # UI Structure & Layout
│   ├── styles.css             # Rich styling & dark theme system
│   └── app.js                 # Frontend API controller & logic
├── server.js                  # Express.js HTTP backend server
├── package.json               # Dependencies and scripts
└── README.md                  # Project Documentation
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine (v18+ recommended, compatible with newer versions).

### Running the Server

1. Open a terminal or PowerShell.
2. Navigate to `F:\Antigravity` or run directly.
3. Start the application:
   ```bash
   node server.js
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## API Documentation

### `GET /api/wallpapers`
Retrieves the list of wallpapers.
- **Query Parameters**:
  - `category` (string, optional): Filter by category (e.g. `Space`).
  - `search` (string, optional): Search by title or tags.
  - `sortBy` (string, optional): `latest` (default) or `downloads` (most popular first).

### `POST /api/wallpapers`
Uploads a new wallpaper file.
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `wallpaperFile` (File): The image file (PNG, JPG, WEBP, etc.)
  - `title` (string): Title of the wallpaper
  - `category` (string): Chosen category
  - `tags` (string, comma-separated list of tags)
  - `dimensions` (string, optional: e.g. `3840x2160`)

### `GET /api/wallpapers/download/:id`
Increments download count in the database and triggers browser download for the specific wallpaper image.
