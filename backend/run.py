import os
from app import create_app
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Read the configuration from .env (if not, use the default value)
config_name = os.getenv("FLASK_CONFIG", "development")
host = os.getenv("APP_HOST", "0.0.0.0")
port = int(os.getenv("APP_PORT", 8000))
debug = config_name == "development"

# Call the application factory to create the Flask app instance
app = create_app("development")

if __name__ == "__main__":
    # Run the application using the built-in development server
    app.run(host=host, port=port, debug=debug)
