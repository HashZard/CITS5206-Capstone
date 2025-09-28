from sqlalchemy import create_engine, text

dsn = "postgresql://readonly:readonly@localhost:5433/gisdb"
print("Using DSN:", dsn)

engine = create_engine(dsn, pool_pre_ping=True)

with engine.connect() as conn:
    version = conn.execute(text("SELECT version();")).scalar()
    print("Connected OK:", version)
