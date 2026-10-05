import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Gemini client with proper telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Medhal Al-Tayeb Products Catalog
const productsCatalog = [
  {
    productId: 'maroki-oud',
    name: 'عود مروكي طبيعي',
    type: 'بخور',
    weight: 'أوقية (28 جرام) / ثمن كيلو (125 جرام)',
    price: '150 ر.س - 550 ر.س',
    link: 'https://medhal-altayeb.com/maroki-oud',
    image: 'https://medhal-altayeb.com/images/maroki.jpg'
  },
  {
    productId: 'trad-oil',
    name: 'دهن عود تراد معتق',
    type: 'دهن عود',
    weight: 'ربع تولة / تولة كاملة',
    price: '120 ر.س - 450 ر.س',
    link: 'https://medhal-altayeb.com/trad-oil',
    image: 'https://medhal-altayeb.com/images/trad.jpg'
  },
  {
    productId: 'kalimantan',
    name: 'بخور كليمنتان فاخر',
    type: 'بخور',
    weight: 'أوقية / ثمن كيلو',
    price: '130 ر.س - 480 ر.س',
    link: 'https://medhal-altayeb.com/kalimantan',
    image: 'https://medhal-altayeb.com/images/kalimantan.jpg'
  },
  {
    productId: 'custom-musk',
    name: 'مسك مدهال الخاص',
    type: 'مسك',
    weight: 'ربع تولة',
    price: '50 ر.س',
    link: 'https://medhal-altayeb.com/custom-musk',
    image: 'https://medhal-altayeb.com/images/musk.jpg'
  }
];

// Medhal Al-Tayeb Assistant prompt
const medhalSystemInstruction = `أنت مساعد المبيعات الذكي الرسمي لمتجر "مدهال الطيب" المتخصص في العود الطبيعي، دهن العود الفاخر، والبخور والمسك. وظيفتك هي إجابة استفسارات العملاء بدقة استناداً إلى قائمة المنتجات الرسمية المتاحة لدينا فقط. لا تقم باختراع منتجات أو أسعار غير موجودة في القائمة المحددة أدناه.

قائمة المنتجات المتاحة والمخزون:
1. عود مروكي طبيعي (Maroki Natural Oud):
   - التصنيف: بخور
   - الخيارات والأسعار المتاحة: أوقية (28 جرام) بسعر 150 ريال سعودي، ثمن كيلو (125 جرام) بسعر 550 ريال سعودي.
   - الرابط: https://medhal-altayeb.com/maroki-oud
   - الصورة: https://medhal-altayeb.com/images/maroki.jpg

2. دهن عود تراد معتق (Aged Trad Oud Oil):
   - التصنيف: أدهان العود والبرفيوم
   - الخيارات والأسعار المتاحة: ربع تولة بسعر 120 ريال سعودي، تولة كاملة بسعر 450 ريال سعودي.
   - الرابط: https://medhal-altayeb.com/trad-oil
   - الصورة: https://medhal-altayeb.com/images/trad.jpg

3. بخور كليمنتان فاخر (Kalimantan Premium Incense):
   - التصنيف: بخور
   - الخيارات والأسعار المتاحة: أوقية بسعر 130 ريال سعودي، ثمن كيلو بسعر 480 ريال سعودي.
   - الرابط: https://medhal-altayeb.com/kalimantan
   - الصورة: https://medhal-altayeb.com/images/kalimantan.jpg

4. مسك مدهال الخاص (Medhal Custom Musk):
   - التصنيف: مسك
   - الخيارات والأسعار المتاحة: ربع تولة بسعر 50 ريال سعودي.
   - الرابط: https://medhal-altayeb.com/custom-musk
   - الصورة: https://medhal-altayeb.com/images/musk.jpg

إرشادات هامة للرد:
- اذكر الخيارات والأسعار بدقة بالريال السعودي وبصيغة جذابة.
- لا تذكر أي أوزان أو أسعار غير الموضحة في القائمة.
- إذا سأل العميل عن منتج غير متاح، أخبره بلطف أنه غير متوفر حالياً ويمكنك ترشيح أحد المنتجات المتاحة كبديل.
- أجب باللهجة السعودية المهذبة واللبقة وبما يناسب هوية المتجر الفخم.`;

app.post('/api/medhal/generate', async (req, res) => {
  const startTime = Date.now();
  try {
    const { userMessage, model = 'gemini-3.8-flash', temperature = 0.4 } = req.body;
    
    if (!userMessage) {
      return res.status(400).json({ success: false, error: 'User message is required' });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: medhalSystemInstruction,
        temperature: parseFloat(temperature),
      }
    });

    const responseText = response.text || '';
    const latency = Date.now() - startTime;

    // Detect matched products based on mentions in text
    const matchedProducts = productsCatalog.filter(p => {
      const keywords = p.productId === 'maroki-oud' ? ['مروكي', 'المروكي', 'maroki'] :
                       p.productId === 'trad-oil' ? ['تراد', 'التراد', 'trad'] :
                       p.productId === 'kalimantan' ? ['كليمنتان', 'الكليمنتان', 'kalimantan'] :
                       p.productId === 'custom-musk' ? ['مسك', 'المسك', 'musk'] : [];
      return keywords.some(keyword => responseText.toLowerCase().includes(keyword));
    });

    res.json({
      success: true,
      text: responseText,
      products: matchedProducts,
      diagnostics: {
        modelUsed: model,
        latency: latency,
        tokenUsage: {
          promptTokens: Math.floor(userMessage.length / 4) + 300, // estimated
          completionTokens: Math.floor(responseText.length / 4) // estimated
        },
        fallback: false,
        retry: 0
      }
    });
  } catch (error: any) {
    console.error('Medhal API Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate response' });
  }
});

// API endpoint for running sandbox simulations
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { systemInstruction, prompt, userMessage, temperature, model = 'gemini-3.8-flash' } = req.body;
    
    // Construct request contents
    const contents: any[] = [];
    if (prompt) {
      contents.push({ role: 'user', parts: [{ text: `${prompt}\n\nUser Input: ${userMessage}` }] });
    } else {
      contents.push({ role: 'user', parts: [{ text: userMessage }] });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction || 'You are a helpful AI assistant.',
        temperature: parseFloat(temperature) || 0.7,
      }
    });

    res.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate response' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { 
      middlewareMode: true,
      hmr: false,
    },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
