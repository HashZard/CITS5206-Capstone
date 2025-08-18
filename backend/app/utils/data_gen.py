import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class PostGISQueryProcessor:
    """A class to handle PostGIS connections and query processing."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 5432,
        database: str = "postgres",
        user: str = "postgres",
        password: str = "",
    ):
        """Initialize PostGIS connection parameters."""
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.connection = None
        self.engine = None

    def connect(self) -> bool:
        """Establish connection to PostGIS database."""
        try:
            # Create psycopg2 connection with autocommit disabled for explicit transaction control
            self.connection = psycopg2.connect(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.user,
                password=self.password,
            )

            # Set autocommit to False for explicit transaction control
            self.connection.autocommit = False

            # Create SQLAlchemy engine for more complex operations if needed
            connection_string = f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
            self.engine = create_engine(connection_string)

            logger.info("Successfully connected to PostGIS database")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to PostGIS database: {e}")
            return False

    def _reconnect(self):
        """Reconnect to the database after a connection error."""
        logger.info("Attempting to reconnect to database...")
        try:
            if self.connection:
                self.connection.close()
            self.connect()
        except Exception as e:
            logger.error(f"Failed to reconnect: {e}")

    def execute_query(self, sql: str) -> List[Dict[str, Any]]:
        """Execute SQL query and return results as list of dictionaries."""
        if not self.connection:
            logger.error("No database connection established")
            return []

        cursor = None
        try:
            # Use a fresh cursor for each query with explicit transaction handling
            cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            cursor.execute(sql)
            results = cursor.fetchall()

            # Commit the transaction
            self.connection.commit()

            # Convert RealDictRow objects to regular dictionaries
            # Handle geometry objects by converting them to WKT format
            processed_results = []
            for row in results:
                row_dict = dict(row)
                for key, value in row_dict.items():
                    # Convert geometry columns to WKT format for JSON serialization
                    if hasattr(value, "wkt"):
                        row_dict[key] = str(value)
                    elif isinstance(value, bytes):
                        # Handle binary data by converting to hex
                        row_dict[key] = value.hex()
                processed_results.append(row_dict)

            logger.info(
                f"Query executed successfully, returned {len(processed_results)} rows"
            )
            return processed_results

        except Exception as e:
            logger.error(f"Error executing query: {e}")
            logger.error(f"SQL: {sql}")

            # Rollback the transaction in case of error
            try:
                self.connection.rollback()
                logger.info("Transaction rolled back due to error")
            except Exception as rollback_error:
                logger.error(f"Failed to rollback transaction: {rollback_error}")
                # If rollback fails, we need to reconnect
                self._reconnect()

            return []

        finally:
            # Always close the cursor
            if cursor:
                cursor.close()

    def close(self):
        """Close database connections."""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")
        if self.engine:
            self.engine.dispose()


def load_json_file(file_path: str) -> List[Dict[str, Any]]:
    """Load JSON file and return parsed data."""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)
            logger.info(f"Loaded {len(data)} queries from {file_path}")
            return data
    except Exception as e:
        logger.error(f"Error loading JSON file {file_path}: {e}")
        return []


def save_json_file(data: List[Dict[str, Any]], file_path: str):
    """Save data to JSON file."""
    try:
        with open(file_path, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2, ensure_ascii=False, default=str)
        logger.info(f"Results saved to {file_path}")
    except Exception as e:
        logger.error(f"Error saving JSON file {file_path}: {e}")


def process_json_file(
    processor: PostGISQueryProcessor, input_file: str, output_file: str
):
    """Process a single JSON file with queries."""
    logger.info(f"Processing file: {input_file}")

    # Load queries from JSON file
    queries_data = load_json_file(input_file)
    if not queries_data:
        return

    # Process each query
    results_data = []
    for item in queries_data:
        if "Query" in item and "SQL" in item:
            query_text = item["Query"]
            sql_command = item["SQL"]

            logger.info(f"Executing query: {query_text}")

            # Execute SQL and get results
            query_results = processor.execute_query(sql_command)

            # Create result entry
            result_entry = {
                "Query": query_text,
                "SQL": sql_command,
                "Result": query_results,
            }

            results_data.append(result_entry)
        else:
            logger.warning(f"Skipping invalid entry: {item}")

    # Save results
    save_json_file(results_data, output_file)


def main():
    """Main function to process all JSON files in the data directory."""

    # Database configuration - update these values as needed
    DB_CONFIG = {
        "host": "localhost",
        "port": 5432,
        "database": "Test",  # Change this to your database name
        "user": "admin",  # Change this to your username
        "password": "admin123",  # Change this to your password
    }

    # Paths
    data_dir = "../data"

    # Initialize PostGIS processor
    processor = PostGISQueryProcessor(**DB_CONFIG)

    # Connect to database
    if not processor.connect():
        logger.error("Failed to connect to database. Exiting.")
        return

    try:
        # Find all JSON files in the data directory (excluding result files)
        json_files = []
        for filename in os.listdir(data_dir):
            if filename.endswith(".json") and not filename.endswith("_results.json"):
                json_files.append(filename)

        logger.info(f"Found {len(json_files)} JSON files to process")

        # Process each JSON file
        for json_file in json_files:
            input_path = os.path.join(data_dir, json_file)
            output_filename = json_file.replace(".json", "_results.json")
            output_path = os.path.join(data_dir, output_filename)

            process_json_file(processor, input_path, output_path)

    except Exception as e:
        logger.error(f"Error in main processing: {e}")

    finally:
        # Close database connection
        processor.close()


if __name__ == "__main__":
    main()
