// netlify/functions/gemini-proxy.js
const fetch = require('node-fetch'); // Netlify FunctionsはNode.js環境で動作するため、node-fetchを使用

exports.handler = async function(event, context) {
    // POSTリクエストのみを処理
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // リクエストボディからプロンプトと規則規程のテキストを取得
    const { prompt, corporateRules } = JSON.parse(event.body);

    // 環境変数からAPIキーを取得
    // Netlifyのダッシュボードで環境変数 GEMINI_API_KEY を設定する必要があります
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        console.error('API Key is not set in Netlify environment variables.');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: API Key missing.' }),
        };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
        const chatHistory = [];
        // 規則規程のテキストとユーザーのプロンプトをAIモデルに渡す
        chatHistory.push({ role: "user", parts: [{ text: `以下の法人の規則規程に基づいて質問に回答してください。もし規則規程に記載されていない内容であれば、「申し訳ありませんが、その情報はこの規則規程には記載されていません。」と回答してください。\n\n規則規程:\n${corporateRules}\n\n質問: ${prompt}` }] });

        const payload = { contents: chatHistory };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', JSON.stringify(errorData));
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: 'Error from Gemini API', details: errorData }),
            };
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ text: result.candidates[0].content.parts[0].text }),
            };
        } else {
            console.error('Unexpected Gemini API response structure:', JSON.stringify(result));
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Unexpected response from AI model.' }),
            };
        }

    } catch (error) {
        console.error('Function execution error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};
