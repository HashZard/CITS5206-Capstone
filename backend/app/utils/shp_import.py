import logging
import os

import dotenv
import geopandas as gpd
from sqlalchemy import create_engine

dotenv.load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Replace with your own path
data_path = "/Users/zeke/Uni/CITS5206-Capstone/capstone_map/10m_physical/"


def data_import(file_name: str):
    try:
        engine = create_engine(os.getenv("POSTGRES_DSN"))
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return

    # Read Shapefile
    try:
        gdf = gpd.read_file(os.path.join(data_path, file_name))
        logger.info(
            f"Successfully read Shapefile: {os.path.join(data_path, file_name)}"
        )
    except Exception as e:
        logger.error(f"Failed to read Shapefile: {e}")
        return

    # Write GeoDataFrame to database
    try:
        # Convert column names to lowercase
        gdf.columns = [col.lower() for col in gdf.columns]
        gdf.to_postgis(
            name=file_name.split(".")[0],
            con=engine,
            if_exists="replace",
            index=False,
            schema="ne_data",
        )
        logger.info("Successfully wrote data to database!")
    except Exception as e:
        logger.error(f"Failed to write data to database: {e}")
        return


if __name__ == "__main__":
    # import all shapefiles in the directory
    for file in os.listdir(data_path):
        if file.endswith(".shp"):
            logger.info(f"Importing {file}...")
            data_import(file)
