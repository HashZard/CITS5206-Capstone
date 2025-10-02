# GeoQuery Platform
React TypeScript Vite Tailwind CSS Shadcn/ui

A modern geographic query platform that transforms natural language into powerful geographic insights. Built with React, TypeScript, and modern web technologies for seamless spatial data analysis and visualisation.

✨ Features
- Natural language geographic queries
- Interactive map visualization
- Smart analytics and insights
- Responsive design with Tailwind CSS
- Modern UI components with Shadcn/ui
- TypeScript for type safety
- Fast development with Vite
- Real-time data processing

🚀 Quick Start

## How to run the website:
A) Tunnel (optional, keep open)
ssh -i "C:\Users\user\.ssh\Capstone.pem" -L 5433:localhost:5432 ubuntu@3.107.231.45 -N


B) Backend (keep open)
cd backend
python run.py


C) Frontend
cd frontend
npm install
npm run dev

Then navigate to the URL printed by Vite (e.g. http://localhost:3000/)

## Prerequisites
- Node.js 18+ 
- npm or yarn

## Installation

### Clone repository
```bash
git clone <your-repository-url>
cd capstone-website/frontend
```

### Install dependencies
```bash
npm install
```

### Environment Setup
Create a `.env` file in the root directory:
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=GeoQuery

# Optional: Analytics
VITE_GA_TRACKING_ID=your-ga-tracking-id
```

### Start development server
```bash
npm run dev
```

This will:
- Start the development server at `http://localhost:3000`
- Enable hot module replacement (HMR)
- Open the application in your browser

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Component Management
npx shadcn@latest add [component]  # Add new Shadcn/ui component
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ui/              # Shadcn/ui components
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── components.json          # Shadcn/ui configuration
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies and scripts
```

## 🎨 Design System

## 🔧 Configuration

### Tailwind CSS
The project uses Tailwind CSS v3.4.4 with custom configuration:
- Custom color palette
- Responsive breakpoints
- Animation utilities
- Dark mode support

### Shadcn/ui
Pre-configured components available:
- Button, Card, Input, Label
- Dialog, DropdownMenu, NavigationMenu
- Form components with validation

### Vite
- Fast HMR (Hot Module Replacement)
- TypeScript support
- Path aliases (`@/` → `src/`)
- Optimized builds

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

## 📚 Technologies Used

- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Component library
- **Lucide React** - Icon library
- **PostCSS** - CSS processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**CITS5206 Information Technology Capstone Project**
