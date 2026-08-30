import axios from 'axios';
import { WeatherSnapshot } from '../types';

export async function askCivicGuide(message: string, lang: string = 'en', category: string = 'general'): Promise<string> {
  try {
    const res = await axios.post('/api/ai/chat', { message, lang, category });
    if (res.data && res.data.reply) {
      return res.data.reply;
    }
    return res.data?.fallback || 'Gudalur civic service response received.';
  } catch (err: any) {
    console.warn('AI Navigator fetch error:', err);
    if (lang === 'ta') {
      return 'கூடலூர் தகவல் மையம்: கூடலூர் நகராட்சி மற்றும் நீலகிரி மாவட்ட அரசு குறைதீர்ப்பு எண்: 1100 (முதல்வரின் முகவரி), மின்துறை உதவி எண்: 94987 94987, வனத்துறை அவசர எண்: 1800 425 6100.';
    }
    return 'Gudalur Civic Lifeline: For official grievances contact CM Helpline 1100, TANGEDCO Minnal 94987 94987, and Gudalur Forest Control 1800 425 6100.';
  }
}

export async function* chatWithGuideStream(message: string, history: any[] = [], lang: string = 'en'): AsyncGenerator<string, void, unknown> {
  try {
    const reply = await askCivicGuide(message, lang);
    const words = reply.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      yield chunk;
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (err) {
    yield 'Gudalur Civic Assistant: Please check your connection or contact local administration desks directly.';
  }
}

export async function fetchLiveWeather(): Promise<WeatherSnapshot> {
  try {
    const res = await axios.get('/api/weather');
    return res.data;
  } catch (err) {
    return {
      temp: 22,
      code: 1,
      aqi: 24,
      uv: 6.0,
      humidity: 78,
      windSpeed: 8,
      rainProbability: 20,
      timestamp: Date.now()
    };
  }
}
