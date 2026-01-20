# TravelAI Planner

AI-powered travel planning application that aggregates flight and accommodation data, analyzes options using AI, and provides optimized travel recommendations.

## Features

- **Flight Search** - Search and compare flights via Amadeus API
- **Accommodation Search** - Search hotels via Amadeus + web search fallback
- **AI Analysis** - OpenAI-powered analysis to find optimal price/quality combinations
- **Smart Recommendations** - Generate complete travel plans with itineraries
- **Price Comparison** - Flexible date searching to find best deals

## Tech Stack

- **Backend**: Node.js with Express.js
- **Frontend**: React with Vite
- **AI**: OpenAI API (gpt-4o or gpt-4o-mini)
- **Flight/Hotel Data**: Amadeus for Developers API
- **Web Search**: SearchAPI (for accommodation fallback)
- **Database**: SQLite (for caching)
- **Styling**: Tailwind CSS

## Prerequisites

Before running, you need API keys from:

1. **Amadeus** - https://developers.amadeus.com (free account)
2. **OpenAI** - https://platform.openai.com
3. **SearchAPI** - https://www.searchapi.io (100 free searches)

## Setup

1. **Clone and install dependencies**:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. **Configure environment variables**:

Edit the `.env` file in the project root with your API keys:

```env
# Amadeus API
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# SearchAPI
SEARCHAPI_KEY=your_searchapi_key
```

3. **Run the application**:

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

4. **Access the app** at http://localhost:5173

## Project Structure

```
travel-agent/
├── .env                    # API keys (create from .env.example)
├── backend/
│   ├── src/
│   │   ├── index.js        # Express server entry
│   │   ├── config/         # Environment configuration
│   │   ├── services/       # API integrations (Amadeus, OpenAI, etc.)
│   │   ├── controllers/    # Route handlers
│   │   ├── routes/         # API routes
│   │   ├── db/             # SQLite database setup
│   │   └── utils/          # AI prompts and utilities
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main application component
│   │   ├── components/     # React components
│   │   ├── services/       # API client
│   │   └── styles/         # Tailwind CSS
│   └── package.json
└── projectcontext.md       # Full implementation plan
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations?keyword=` | Search cities/airports |
| GET | `/api/flights/search` | Search flights |
| GET | `/api/hotels/search` | Search hotels |
| POST | `/api/recommendations` | Get AI-powered recommendations |
| POST | `/api/recommendations/plan` | Generate travel itinerary |
| GET | `/api/search/status` | Check search API quota |

## Usage

1. Enter your origin and destination (cities will autocomplete)
2. Select travel dates
3. Optionally set budget and travel preferences
4. Click "Find Best Travel Options"
5. Review AI-curated recommendations with insights

## Notes

- The Amadeus test environment has limited data - some routes may return no results
- SearchAPI has 100 free searches - use wisely
- Cache is enabled to reduce API calls and improve performance
