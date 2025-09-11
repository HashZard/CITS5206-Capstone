import dotenv
import geopandas as gpd
from sqlalchemy import create_engine
import logging as logger
import os

dotenv.load_dotenv()


data_path = "/Users/zeke/Uni/CITS5206-Capstone/capstone_map/10m_cultural/10m_cultural/"


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
        gdf.to_postgis(
            name=file_name,
            con=engine,
            if_exists="replace",
            index=False,
        )
        logger.info("Successfully wrote data to database!")
    except Exception as e:
        logger.error(f"Failed to write data to database: {e}")
        return


if __name__ == "__main__":
    data_import("ne_10m_admin_2_counties_tomatch.shp")
