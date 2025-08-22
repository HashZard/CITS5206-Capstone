# Classification Service API Examples

The Classification Service provides endpoints for automatically classifying geographic data into the three-level hierarchy (L1 Categories, L2 Cards, L3 Tables).

## API Endpoints

### 1. Data Classification
**POST** `/api/classification/classify`

Classify data from various sources (table, file, content).

```json
{
  "data_source": "table",
  "source_identifier": "ne_countries_chn",
  "classification_type": "auto",
  "target_levels": ["l1", "l2", "l3"],
  "confidence_threshold": 0.7,
  "max_categories": 10,
  "include_keywords": true
}
```

Response:
```json
{
  "ok": true,
  "data": {
    "success": true,
    "message": "Successfully classified data with 3 results",
    "total_items": 3,
    "classified_items": 3,
    "results": [
      {
        "level": "l1",
        "category_id": null,
        "category_name": "administrative",
        "confidence": 0.95,
        "keywords": ["administrative", "boundary", "border"],
        "reasoning": "Predefined classification for table ne_countries_chn"
      }
    ],
    "execution_time": 0.1
  }
}
```

### 2. Auto Classification
**POST** `/api/classification/auto`

Automatically classify a table with minimal configuration.

```json
{
  "table_name": "ne_lakes",
  "sample_size": 100,
  "feature_columns": null,
  "use_spatial_info": true,
  "use_attribute_info": true
}
```

### 3. Category Recommendation
**POST** `/api/classification/recommend`

Get category recommendations based on data description.

```json
{
  "description": "Dataset containing administrative boundaries and population data for major cities worldwide",
  "keywords": ["city", "population", "administrative"],
  "data_type": "spatial",
  "domain": "urban_planning"
}
```

### 4. Classification Keywords
**GET** `/api/classification/keywords?level=l1&category=administrative`

Get classification keywords for debugging and understanding.

### 5. Classification Statistics
**GET** `/api/classification/stats`

Get system-wide classification statistics.

### 6. Health Check
**GET** `/api/classification/health`

Check service health and capabilities.

## Classification Hierarchy

### L1 Categories (Top Level)
- **administrative**: Boundaries, regions, territories
- **natural**: Physical features, terrain, landscape  
- **infrastructure**: Transport, utilities, facilities
- **environment**: Climate, weather, ecosystems
- **social**: Population, demographics, economics
- **land_use**: Land cover, agriculture, urban development

### L2 Cards (Overview Level)
- **countries**: Nations, states, republics
- **cities**: Urban areas, municipalities
- **waters**: Lakes, rivers, oceans
- **mountains**: Hills, peaks, ranges
- **roads**: Highways, streets, routes
- **railways**: Trains, metros, subways
- **airports**: Aviation facilities
- **ports**: Maritime facilities

### L3 Tables (Detailed Level)
- **points**: Point locations, coordinates
- **lines**: Linear features, networks
- **polygons**: Area features, boundaries
- **raster**: Grid data, satellite imagery

## Example Usage

### Classify a Geographic Table
```bash
curl -X POST http://localhost:8000/api/classification/classify \
  -H "Content-Type: application/json" \
  -d '{
    "data_source": "table",
    "source_identifier": "world_cities", 
    "target_levels": ["l1", "l2"],
    "confidence_threshold": 0.6
  }'
```

### Get Category Recommendations
```bash
curl -X POST http://localhost:8000/api/classification/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Global dataset of major airports with runway information and passenger statistics",
    "data_type": "spatial"
  }'
```

### Check Service Health
```bash
curl http://localhost:8000/api/classification/health
```

## Error Handling

The service returns structured error responses:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid data source type",
    "details": {}
  }
}
```

Error codes:
- `VALIDATION_ERROR`: Invalid request parameters
- `SEMANTIC_ERROR`: Classification logic errors
- `INTERNAL_ERROR`: Server-side errors