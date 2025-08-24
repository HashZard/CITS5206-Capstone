# -*- coding: utf-8 -*-
# 行记录转 GeoJSON FeatureCollection 的工具函数
def rows_to_feature_collection(rows, geom_field="geometry"):
    features = []
    for r in rows:
        geom = r.get(geom_field)
        props = {k: v for k, v in r.items() if k != geom_field}
        features.append({"type": "Feature", "geometry": geom, "properties": props})
    return {"type": "FeatureCollection", "features": features}
