# GeoQuery Platform Frontend

Tech Stack: React · TypeScript · Vite · Tailwind CSS · Shadcn/ui

A modern geographic query platform that transforms natural language into powerful geographic insights. Built with React, TypeScript, and modern web technologies for seamless spatial data analysis and visualization.

## ✨ Features

- **Natural Language Processing**: Transform natural language queries into geographic insights
- **Interactive Map Visualization**: Real-time map rendering with advanced geographic data
- **Smart Analytics**: AI-powered query classification and routing
- **Responsive Design**: Modern UI with Tailwind CSS and Shadcn/ui components
- **Type Safety**: Full TypeScript implementation for robust development
- **Real-time Processing**: Fast query execution with live results
- **Export Capabilities**: PDF and data export functionality
- **User Management**: Authentication and user session handling

## 🚀 Complete Setup & Run Instructions

### Prerequisites

Before starting, ensure you have the following installed:

- **Node.js 18+** ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js) or **yarn**
- **Git** ([Download here](https://git-scm.com/))

### Step 1: Clone the Repository

```bash
git clone https://github.com/HashZard/CITS5206-Capstone.git
cd CITS5206-Capstone
```

### Step 2: Database Setup (on backend README.md)

### Step 3: Backend Setup (on backend README.md)

### Step 4: Frontend Setup

Open another new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

### Step 5: Environment Configuration

No `.env` file is required for the default local setup. During development, all `/api` requests are proxied to the backend running at `http://127.0.0.1:8000` (see `vite.config.ts`). If you need to override defaults, create a `.env` file in `frontend/` and add any custom variables you reference in code.

### Step 6: Start the Development Server

```bash
npm run dev
```

The frontend will start on `http://localhost:3000` (or the next available port)

### Step 7: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/           # Layout components
│   │   │   ├── Footer.tsx
│   │   │   └── TopNav.tsx
│   │   ├── map/             # Map visualization components
│   │   │   ├── AdvancedMapCanvas.tsx
│   │   │   ├── MapRenderers.ts
│   │   │   └── SingleCountryMapCanvas.tsx
│   │   ├── result/          # Query result display components
│   │   │   ├── AutoComparisonChart.tsx
│   │   │   ├── CountryCard.tsx
│   │   │   ├── QueryDetails.tsx
│   │   │   ├── ResultDataTable.tsx
│   │   │   ├── ResultHeader.tsx
│   │   │   └── SuggestPanel.tsx
│   │   ├── suggest/         # Query suggestion components
│   │   │   ├── SuggestDropdown.tsx
│   │   │   └── SuggestInput.tsx
│   │   └── ui/              # Reusable UI components (Shadcn/ui)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── CopyButton.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── ExportButton.tsx
│   │       ├── ExportModal.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── LoadingBar.tsx
│   │       ├── navigation-menu.tsx
│   │       ├── Toast.tsx
│   │       └── VerticalToolbar.tsx
│   ├── lib/
│   │   ├── auth.ts          # Authentication utilities
│   │   ├── classify.ts      # Query classification logic
│   │   ├── text/            # Text processing utilities
│   │   │   ├── tfidf.ts
│   │   │   └── tokenize.ts
│   │   └── utils.ts         # Utility functions
│   ├── pages/               # Application pages
│   │   ├── About.tsx
│   │   ├── History.tsx
│   │   ├── Import.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Result.tsx
│   │   ├── Tutorials.tsx
│   │   └── User.tsx
│   ├── services/            # API services
│   │   ├── queryService.ts
│   │   └── shareService.ts
│   ├── types/               # TypeScript type definitions
│   │   └── result.ts
│   ├── utils/               # Utility functions
│   │   ├── exportPdf.ts
│   │   ├── geoMapping.ts
│   │   ├── geometry.ts
│   │   ├── labelRenderer.ts
│   │   └── visualization.ts
│   ├── data/                # Seed data and configurations
│   │   ├── seedQuestions.extra.json
│   │   └── seedQuestions.ts
│   ├── assets/              # Static assets
│   │   └── react.svg
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # Application entry point
│   ├── index.css            # Global styles
│   └── vite-env.d.ts        # Vite type definitions
├── public/                  # Public static assets
│   ├── earth.jpg
│   └── vite.svg
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── components.json          # Shadcn/ui configuration
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.app.json        # TypeScript app configuration
├── tsconfig.node.json       # TypeScript node configuration
├── eslint.config.js         # ESLint configuration
└── package.json             # Dependencies and scripts
```

## 🎨 Design System

### Tailwind CSS Configuration
- **Custom Color Palette**: Brand-specific colors for geographic themes
- **Responsive Breakpoints**: Mobile-first responsive design
- **Animation Utilities**: Smooth transitions and micro-interactions
- **Dark Mode Support**: Built-in dark/light theme switching

### Shadcn/ui Components
Pre-configured and ready-to-use components:
- **Form Components**: Input, Label, Button with validation
- **Layout Components**: Card, Dialog, NavigationMenu
- **Interactive Components**: DropdownMenu, Toast notifications
- **Data Display**: Tables, Charts, Export functionality

## 🔧 Configuration

### Vite Configuration
- **Fast HMR**: Hot Module Replacement for instant updates
- **TypeScript Support**: Full type checking and IntelliSense
- **Path Aliases**: `@/` maps to `src/` directory
- **Optimized Builds**: Tree shaking and code splitting
- **Node Polyfills**: Support for Node.js modules in browser

### ESLint Configuration
- **TypeScript Rules**: Strict type checking
- **React Hooks**: Proper hook usage patterns
- **Code Quality**: Consistent code style enforcement

**Dependencies Issues**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Additional Libraries
- **Axios** - HTTP client for API requests
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **Lucide React** - Beautiful icon library
- **html2canvas & jsPDF** - Export functionality
- **wkx** - Well-Known Text (WKT) geometry handling

### Development Tools
- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing
- **Vite Plugin Node Polyfills** - Node.js compatibility

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   npm run lint
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing component structure
- Use Tailwind CSS for styling
- Write descriptive commit messages
- Add JSDoc comments for complex functions

---

**CITS5206 Information Technology Capstone Project**  
*University of Western Australia*

Built with ❤️ by the GeoQuery Team
