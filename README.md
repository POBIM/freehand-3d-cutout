<div align="center">

# Freehand 3D Cutout

**Turn Photos into 3D Objects** - Upload an image, draw a shape, and extrude it instantly!

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.160-black.svg)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## Features

- **Freehand Drawing** - Draw any shape on your image with intuitive brush tools
- **Instant 3D Extrusion** - Convert your drawn shape into a 3D object in real-time
- **Customizable Geometry** - Adjust thickness, edge style (sharp/rounded), and side colors
- **Camera Controls** - Switch between Perspective and Isometric views, adjust FOV
- **Lighting Settings** - Control brightness and light color for perfect renders
- **Save/Load Projects** - Export your work as JSON and continue editing later

## Tech Stack

- **React 18** - Modern UI framework
- **Three.js** with **@react-three/fiber** - 3D rendering
- **@react-three/drei** - Useful helpers for React Three Fiber
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Bun** - Fast JavaScript runtime and package manager

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/POBIM/freehand-3d-cutout.git
   cd freehand-3d-cutout
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
bun run build
bun run preview
```

## How to Use

1. **Upload** - Click the upload area or drag & drop an image (PNG, JPG, WEBP)
2. **Draw** - Use your mouse/finger to draw a freehand shape around the area you want to extrude
3. **Customize** - Adjust 3D settings:
   - **Thickness** - Control the depth of extrusion
   - **Side Color** - Change the color of extruded sides
   - **Edge Style** - Sharp or rounded edges
   - **Camera** - Perspective or Isometric view
   - **Lighting** - Brightness and light color
4. **Save** - Export your project as JSON to continue later

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

You are free to use, modify, and distribute this software for any purpose, including commercial use.

---

<div align="center">

Made with love for a better society

**Free to use, free to modify, free to share**

</div>
