/**
 * ATS CV Generator - Core Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const generateBtn = document.getElementById('generateBtn');
    const exportBtn = document.getElementById('exportBtn');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');

    const linkedinProfile = document.getElementById('linkedinProfile');
    const jobDescription = document.getElementById('jobDescription');
    const cvPreview = document.getElementById('cvPreview');

    const settingsBtn = document.getElementById('settingsBtn');
    const apiModal = document.getElementById('apiModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const saveApiBtn = document.getElementById('saveApiBtn');
    const apiKeyInput = document.getElementById('apiKey');
    const apiProviderSelect = document.getElementById('apiProvider');

    // Load Settings from LocalStorage
    const loadSettings = () => {
        const key = localStorage.getItem('api_key');
        const provider = localStorage.getItem('api_provider') || 'openai';
        if (key) apiKeyInput.value = key;
        apiProviderSelect.value = provider;
    };

    loadSettings();

    // Modal Interactions
    settingsBtn.addEventListener('click', () => {
        apiModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        apiModal.classList.add('hidden');
    });

    saveApiBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        const provider = apiProviderSelect.value;

        if (key) {
            localStorage.setItem('api_key', key);
            localStorage.setItem('api_provider', provider);
            apiModal.classList.add('hidden');
        } else {
            alert("Please enter a valid API key.");
        }
    });

    // Call API based on provider
    const callAIProvider = async (provider, key, systemPrompt, userContent) => {
        // We use a CORS Proxy since OpenAI and Anthropic APIs do not support standard browser CORS
        const corsProxy = 'https://corsproxy.io/?';

        if (provider === 'openai') {
            const url = encodeURIComponent('https://api.openai.com/v1/chat/completions');
            const response = await fetch(corsProxy + url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.2
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices[0].message.content;
        }
        else if (provider === 'anthropic') {
            const url = encodeURIComponent('https://api.anthropic.com/v1/messages');
            const response = await fetch(corsProxy + url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.2
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.content[0].text;
        }
    };

    // Generate CV
    generateBtn.addEventListener('click', async () => {
        const profileText = linkedinProfile.value.trim();
        const jdText = jobDescription.value.trim();
        const apiKey = localStorage.getItem('api_key');
        const apiProvider = localStorage.getItem('api_provider') || 'openai';

        if (!profileText || !jdText) {
            alert("Please provide both your LinkedIn Profile data and the Target Job Description.");
            return;
        }

        if (!apiKey) {
            alert("API Key is missing. Please set it in the settings.");
            apiModal.classList.remove('hidden');
            return;
        }

        // Set Loading State
        generateBtn.disabled = true;
        btnText.textContent = 'Generating...';
        loader.classList.remove('hidden');

        try {
            const systemPrompt = `You are an expert ATS (Applicant Tracking System) CV optimizer. 
Your goal is to parse the raw LinkedIn profile data and the target Job Description (JD), and rewrite the CV to maximize the ATS match score and get the candidate hired.
Rules for the CV:
1. ONLY use strict Markdown. No HTML, no tables, no columns.
2. Structure: Contact Info (center), Professional Summary, Core Competencies / Skills (exact JD keyword matches), Professional Experience (reverse chronological format with bullet points starting with strong action verbs), Education.
3. Tailor the professional summary and experience bullet points to strongly align with the JD requirements without lying.
4. Integrate keywords from the JD naturally into the experience bullets.
5. Do NOT include any conversational text before or after the resume. Output ONLY the resume content in markdown.`;

            const userContent = `### LinkedIn Profile Data:\n${profileText}\n\n### Target Job Description:\n${jdText}`;

            const markdownResume = await callAIProvider(apiProvider, apiKey, systemPrompt, userContent);

            // Render Markdown to HTML
            if (typeof marked !== 'undefined') {
                const htmlContent = marked.parse(markdownResume);
                cvPreview.innerHTML = htmlContent;
                cvPreview.classList.remove('empty');
                exportBtn.disabled = false;
            } else {
                throw new Error("Markdown parser not available.");
            }

        } catch (error) {
            console.error(error);
            alert(`Error generating CV: ${error.message}`);
        } finally {
            // Reset Loading State
            generateBtn.disabled = false;
            btnText.textContent = 'Generate ATS CV';
            loader.classList.add('hidden');
        }
    });

    // Export to PDF using html2pdf
    exportBtn.addEventListener('click', () => {
        const element = document.getElementById('cvPreview');
        const opt = {
            margin: 0.5,
            filename: 'Tailored_ATS_CV.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Temporarily adjust styles for better PDF output if needed
        element.style.boxShadow = 'none';

        html2pdf().set(opt).from(element).save().then(() => {
            // Restore styles
            element.style.boxShadow = 'var(--shadow-lg)';
        });
    });

});
