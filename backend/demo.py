#!/usr/bin/env python3
# demo_capstone.py (English titles only)

import glob
import os
import geopandas as gpd
import matplotlib.pyplot as plt


def main():
    # —— Modify this path to your 10m_physical directory ——
    data_dir = "/Users/zard/Documents/IT Course/CITS5206 Capstone/capstone_map/10m_physical"

    # 1. Find all .shp files
    shapefiles = glob.glob(os.path.join(data_dir, "*.shp"))
    if not shapefiles:
        print(f"No .shp files found in {data_dir}. Please check the path.")
        return

    # 2. List found shapefiles
    print("Found Shapefiles:")
    for shp in shapefiles:
        print(" -", shp)

    # 3. Choose coastline if available, otherwise first file
    coastline = next((s for s in shapefiles if "coastline" in os.path.basename(s)), shapefiles[0])
    print(f"\nReading sample layer: {os.path.basename(coastline)}")

    # 4. Load and preview attribute table
    gdf = gpd.read_file(coastline)
    print("\nAttribute table preview:")
    print(gdf.head())

    # 5. Plot and save map (English-only title)
    ax = gdf.plot(figsize=(10, 6), edgecolor="black")
    ax.set_title(f"Example Layer: {os.path.basename(coastline)}")
    ax.set_axis_off()
    plt.tight_layout()
    output_png = os.path.join(data_dir, "demo_output.png")
    plt.savefig(output_png, dpi=300)
    print(f"\nMap saved to: {output_png}")
    plt.show()


if __name__ == "__main__":
    main()
