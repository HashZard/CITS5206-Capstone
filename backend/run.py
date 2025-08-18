import os
from app import create_app
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Call the application factory to create the Flask app instance
app = create_app("development")

if __name__ == "__main__":
    # Run the application using the built-in development server
    app.run(host="0.0.0.0", port=8000, debug=True)
