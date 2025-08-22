# CITS5206 Capstone Project - GeoQuery Platform

A modern geographic query platform that transforms natural language into powerful geographic insights. This project combines a React TypeScript frontend with a FastAPI Python backend, utilizing PostGIS for spatial data operations.

## 🏗️ Project Structure

```
CITS5206-Capstone/
├── backend/                    # FastAPI backend application
│   ├── app/                   # Application source code
│   │   ├── api/              # HTTP routes and endpoints
│   │   ├── adapters/         # External service integrations (DB, Redis, etc.)
│   │   ├── models/           # Pydantic models and database schemas
│   │   ├── services/         # Business logic layer
│   │   └── utils/            # Utility functions and helpers
│   ├── config.py             # Application configuration
│   ├── run.py                # Application entry point
│   ├── pyproject.toml        # Python dependencies and project metadata
│   └── README.md             # Backend-specific documentation
├── frontend/                  # React TypeScript frontend
│   ├── src/                  # Source code
│   │   ├── components/       # React components
│   │   │   ├── ui/          # Reusable UI components (Shadcn/ui)
│   │   │   └── layout/      # Layout components
│   │   ├── lib/             # Utility libraries
│   │   └── assets/          # Static assets
│   ├── public/              # Public static files
│   ├── package.json         # Node.js dependencies and scripts
│   └── README.md            # Frontend-specific documentation
├── docs/                     # Project documentation
│   ├── meeting_minutes/     # Meeting records and minutes
│   └── project_plan.md      # Project timeline and planning
├── research/                 # Research materials and data analysis
│   └── 3level/              # Three-level classification strategy
├── docker-compose.yml       # Docker services configuration
├── .gitignore              # Git ignore patterns
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- **Backend**: Python 3.13+, PostgreSQL with PostGIS extension
- **Frontend**: Node.js 18+, npm or yarn
- **Docker** (optional): For easy database setup

### Setup with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/HashZard/CITS5206-Capstone.git
   cd CITS5206-Capstone
   ```

2. **Start the database services**
   ```bash
   docker compose up -d
   ```
   This will start:
   - PostGIS database on port 5432
   - pgAdmin on port 8080

3. **Set up the backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   pip install -e .
   python run.py
   ```

4. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Manual Setup

Refer to the individual README files in `backend/` and `frontend/` directories for detailed setup instructions without Docker.

## 🛠️ Development

### Backend Development
```bash
cd backend
python run.py              # Start development server
python -m pytest          # Run tests (if available)
```

### Frontend Development
```bash
cd frontend
npm run dev               # Start development server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

## 📊 Database

The project uses PostgreSQL with PostGIS extension for spatial data operations. The database schema includes:

- Geographic regions and boundaries
- Country/administrative data  
- Marine and terrestrial features
- Three-level classification system (L1, L2, L3)

### Database Access
- **Database**: `gisdb`
- **Host**: `localhost:5432` 
- **pgAdmin**: `http://localhost:8080`
  - Email: `dzx@dzx.com`
  - Password: `dzx123123`

## 🏭 Architecture

### Backend Architecture
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM with PostGIS support
- **Pydantic**: Data validation and serialization
- **Redis**: Caching layer
- **PostGIS**: Spatial database operations

### Frontend Architecture  
- **React 18**: UI library with hooks
- **TypeScript 5**: Type safety
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Shadcn/ui**: Modern component library

## 📖 Documentation

- [Project Planning](docs/project_plan.md)
- [Meeting Minutes](docs/meeting_minutes/)
- [Backend Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the project structure
4. Test your changes (backend and frontend)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Organization Guidelines

- **Keep components focused**: Each component should have a single responsibility
- **Use proper typing**: Leverage TypeScript for better code quality
- **Follow naming conventions**: Use descriptive names for files and functions
- **Document complex logic**: Add comments for business logic and algorithms
- **Test your changes**: Ensure builds pass before submitting PRs

## 📄 License

This project is part of the CITS5206 Information Technology Capstone Project at the University of Western Australia.

---

**CITS5206 Information Technology Capstone Project**
