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
data_path = "/Users/zeke/Uni/CITS5206-Capstone/capstone_map/10m_cultural/10m_cultural/"


def data_import(file_name: str):
    try:
        engine = create_engine(os.getenv("POSTGRES_DSN"))
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return

    # Read Shapefile
    try:
        df = gpd.read_file(os.path.join(data_path, file_name))
        logger.info(f"Successfully read file: {os.path.join(data_path, file_name)}")
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        return

    # Convert column names to lowercase
    df.columns = [col.lower() for col in df.columns]
    table_name = os.path.splitext(file_name)[0]

    # A robust check for valid geometry.
    # A file can be read as a GeoDataFrame but have no actual geometries (all null).
    has_valid_geometry = "geometry" in df.columns and df.geometry.notna().any()

    if has_valid_geometry:
        logger.info(
            f"'{file_name}' contains valid geometry. Writing as a spatial table."
        )
        # Check and set CRS if missing
        if df.crs is None:
            logger.warning(
                f"CRS not found for {file_name}. Setting to EPSG:4326 (WGS 84)."
            )
            df.set_crs("EPSG:4326", inplace=True)

        # Write GeoDataFrame to database using to_postgis
        try:
            df.to_postgis(
                name=table_name,
                con=engine,
                if_exists="replace",
                index=False,
                schema="ne_data",
            )
            logger.info(f"Successfully wrote spatial table '{table_name}' to database!")
        except Exception as e:
            logger.error(f"Failed to write spatial table to database: {e}")
            return
    else:
        # If it has no valid geometries, treat it as a regular table
        logger.warning(
            f"'{file_name}' does not contain valid geometry. Writing as a regular table."
        )

        # Drop the empty geometry column if it exists to keep the database clean
        if "geometry" in df.columns:
            df = df.drop(columns=["geometry"])

        try:
            df.to_sql(
                name=table_name,
                con=engine,
                if_exists="replace",
                index=False,
                schema="ne_data",
            )
            logger.info(f"Successfully wrote regular table '{table_name}' to database!")
        except Exception as e:
            logger.error(f"Failed to write regular table to database: {e}")
            return


if __name__ == "__main__":
    # Import all shapefiles in the directory
    # for file in os.listdir(data_path):
    #     if file.endswith(".shp"):
    #         logger.info(f"Importing {file}...")
    #         data_import(file)

    # Import single shapefile (this one has a null geometry column)
    data_import("ne_10m_admin_0_names.shp")
