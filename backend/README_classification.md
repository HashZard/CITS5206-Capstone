# Classification Service

The Classification Service is a key component of the three-level geographic information system that automatically categorizes geographic data into a hierarchical structure.

## Overview

The service classifies geographic data into three levels:

- **L1 Categories** (Top Level): Broad thematic categories
- **L2 Cards** (Overview Level): Specific data types within themes  
- **L3 Tables** (Detail Level): Data representation formats

## Features

### 🎯 Automatic Classification
- Analyze table names, file names, or content descriptions
- Assign confidence scores to classification results
- Support multiple classification strategies (keyword matching, content analysis)

### 📊 Multi-Level Hierarchy
- **L1**: administrative, natural, infrastructure, environment, social, land_use
- **L2**: countries, cities, waters, mountains, roads, railways, airports, ports
- **L3**: points, lines, polygons, raster

### 🔍 Intelligent Keyword Matching
- Predefined geographic keyword dictionaries
- Fuzzy matching for partial keyword presence
- Confidence scoring based on keyword relevance

### 📈 Statistics and Analytics
- Classification confidence summaries
- Category distribution analysis
- Performance metrics and execution timing

## API Endpoints

### Classification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/classification/classify` | POST | Classify data from various sources |
| `/api/classification/auto` | POST | Auto-classify table with minimal config |
| `/api/classification/recommend` | POST | Get category recommendations |
| `/api/classification/keywords` | GET | Retrieve classification keywords |
| `/api/classification/stats` | GET | Get classification statistics |
| `/api/classification/health` | GET | Service health check |

## Usage Examples

### Basic Table Classification

```python
# Classify a geographic table
import requests

data = {
    "data_source": "table",
    "source_identifier": "world_cities",
    "target_levels": ["l1", "l2", "l3"],
    "confidence_threshold": 0.7
}

response = requests.post("/api/classification/classify", json=data)
result = response.json()

# Expected result:
# L1: social (cities are social/demographic features)
# L2: cities (specific urban settlement type)
# L3: points (cities represented as point locations)
```

### Content Analysis Classification

```python
# Classify based on content description
data = {
    "data_source": "content", 
    "source_identifier": "Dataset of major lakes and water bodies with depth measurements",
    "target_levels": ["l1", "l2"],
    "confidence_threshold": 0.5
}

response = requests.post("/api/classification/classify", json=data)

# Expected result:
# L1: natural (water bodies are natural features)
# L2: waters (lakes are water features)
```

### Auto Classification

```python
# Quick auto-classification of a table
data = {
    "table_name": "ne_countries_chn",
    "sample_size": 100,
    "use_spatial_info": True
}

response = requests.post("/api/classification/auto", json=data)
```

### Category Recommendations

```python
# Get category recommendations for new data
data = {
    "description": "Administrative boundaries for provinces with population statistics", 
    "keywords": ["administrative", "boundary", "population"],
    "data_type": "spatial"
}

response = requests.post("/api/classification/recommend", json=data)
```

## Classification Logic

### Predefined Classifications
The service includes predefined classifications for common geographic datasets:

```python
{
    'ne_countries_chn': {
        'l1': 'administrative',  # Administrative/political data
        'l2': 'countries',       # Country-level entities
        'l3': 'polygons'         # Area representation
    },
    'ne_lakes': {
        'l1': 'natural',         # Natural features
        'l2': 'waters',          # Water bodies
        'l3': 'polygons'         # Area representation
    }
}
```

### Keyword-Based Classification
For unknown datasets, the service uses keyword matching:

**L1 Keywords:**
- `administrative`: boundary, border, region, territory
- `natural`: physical, terrain, landscape, topography
- `infrastructure`: transport, utility, facility, network
- `environment`: climate, weather, ecosystem, habitat
- `social`: population, demographic, economic, cultural
- `land_use`: agriculture, forest, urban, development

**L2 Keywords:**
- `countries`: nation, state, republic
- `cities`: town, urban, municipality, settlement
- `waters`: lake, river, ocean, sea, stream
- `mountains`: hill, peak, range, elevation
- `roads`: highway, street, route, path

**L3 Keywords:**
- `points`: location, coordinate, position
- `lines`: linear, network, connection
- `polygons`: area, region, zone, boundary
- `raster`: grid, pixel, image, satellite

### Confidence Scoring
The service calculates confidence scores based on:

1. **Keyword Match Ratio**: Number of matched keywords / Total keywords
2. **Content Relevance**: Frequency of matched keywords in content
3. **Predefined Accuracy**: High confidence (0.95) for predefined tables
4. **Fuzzy Matching**: Graduated confidence for partial matches

## Testing

Run the comprehensive test suite:

```bash
cd backend
python tests/test_classification_service.py
```

Test coverage includes:
- ✅ Keyword matching for all levels (L1, L2, L3)
- ✅ Predefined table classifications
- ✅ Content-based classification
- ✅ Confidence threshold filtering
- ✅ Unknown data handling
- ✅ Edge cases (empty content, invalid inputs)

## Error Handling

The service provides structured error responses:

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

Common error codes:
- `VALIDATION_ERROR`: Invalid request parameters
- `SEMANTIC_ERROR`: Classification logic errors  
- `INTERNAL_ERROR`: Server-side errors

## Performance

- **Average Response Time**: < 100ms for keyword-based classification
- **Throughput**: Supports concurrent classification requests
- **Memory Usage**: Lightweight keyword dictionary approach
- **Scalability**: Stateless service design for horizontal scaling

## Integration

The Classification Service integrates with:

- **Tri-Level Model**: L1Category, L2Card, L3Table entities
- **Search Service**: Enhanced search with classification metadata
- **Import/Export**: Automatic classification during data import
- **Query Service**: Classification-aware query optimization

## Future Enhancements

- 🤖 **ML Integration**: Use LLM service for advanced content analysis
- 🌐 **Multi-language**: Support for non-English geographic terms
- 📚 **Learning**: Improve classifications based on user feedback
- 🔗 **Ontology**: Integration with geographic ontologies (ISO 19115, INSPIRE)
- 📍 **Spatial Analysis**: Use geometric properties for classification
- 🎯 **Custom Rules**: User-defined classification rules