import OpenAI from 'openai';
import { config } from '../config/index.js';
import { PROMPTS } from '../utils/prompts.js';

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model;
  }

  /**
   * Analyze travel options and provide recommendations
   */
  async analyzeAndRecommend(data) {
    const systemPrompt = PROMPTS.TRAVEL_ANALYST;
    const userPrompt = this.buildAnalysisPrompt(data);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('[OpenAI] Analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate a natural language travel plan
   */
  async generateTravelPlan(recommendation, destinationInfo) {
    const systemPrompt = PROMPTS.TRAVEL_PLANNER;

    const userPrompt = `
Based on the selected travel option and destination information, create a detailed travel plan.

SELECTED OPTION:
${JSON.stringify(recommendation, null, 2)}

DESTINATION INFORMATION:
${JSON.stringify(destinationInfo, null, 2)}

Please create a day-by-day itinerary with practical tips.
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('[OpenAI] Travel plan generation error:', error);
      throw error;
    }
  }

  /**
   * Smart query builder - determines what to search for given limited searches
   */
  async buildSmartSearchQueries(context) {
    const systemPrompt = PROMPTS.SEARCH_OPTIMIZER;

    const userPrompt = `
Given the following travel search context, determine the most valuable search queries to enrich the results.
We have LIMITED search API calls (${context.remainingSearches} remaining), so choose wisely.

SEARCH CONTEXT:
- Destination: ${context.destination}
- Travel Dates: ${context.checkIn} to ${context.checkOut}
- Budget Level: ${context.budget || 'not specified'}
- Travel Style: ${context.travelStyle || 'not specified'}
- Specific Interests: ${context.interests?.join(', ') || 'none specified'}

What are the 1-3 most valuable searches to enhance recommendations?
Return as JSON array of search queries.
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content).queries || [];
    } catch (error) {
      console.error('[OpenAI] Query building error:', error);
      return []; // Fallback to no additional searches
    }
  }

  buildAnalysisPrompt(data) {
    return `
Analyze the following travel options and provide recommendations.

SEARCH PARAMETERS:
- Origin: ${data.searchContext.origin}
- Destination: ${data.searchContext.destination}
- Dates: ${data.searchContext.departureDate} to ${data.searchContext.returnDate || 'one-way'}
- Travelers: ${data.searchContext.adults} adults
- Budget: ${data.searchContext.budget || 'flexible'}
- Priorities: ${data.searchContext.priorities?.join(', ') || 'best value'}

AVAILABLE FLIGHTS (${data.flights.length} options):
${JSON.stringify(data.flights.slice(0, 20), null, 2)}

AVAILABLE HOTELS (${data.hotels.length} options):
${JSON.stringify(data.hotels.slice(0, 15), null, 2)}

${data.webSearchResults ? `
ADDITIONAL CONTEXT FROM WEB:
${JSON.stringify(data.webSearchResults, null, 2)}
` : ''}

USER PREFERENCES:
${JSON.stringify(data.preferences || {}, null, 2)}

Please analyze all options and return a JSON response with:
1. "recommendations": Array of top 3-5 combined packages (flight + hotel), each with:
   - "rank": 1-5
   - "flightId": ID of recommended flight
   - "hotelId": ID of recommended hotel
   - "totalPrice": Combined price
   - "valueScore": 1-100 score for value
   - "reasoning": Why this combination is recommended
   - "pros": Array of advantages
   - "cons": Array of disadvantages
   - "bestFor": Who this option is best suited for

2. "insights": Object with:
   - "priceAnalysis": Analysis of price ranges and value
   - "timingAdvice": Best booking timing or date flexibility suggestions
   - "alternativeSuggestions": Any alternative destinations or dates worth considering
   - "warnings": Any red flags or things to watch out for

3. "summary": A brief 2-3 sentence summary of the overall options
`;
  }
}

export const openaiService = new OpenAIService();
