"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FALLBACK_MODELS = exports.ai = void 0;
exports.generateWithFallback = generateWithFallback;
exports.executeWithFallback = executeWithFallback;
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
/**
 * Global Genkit instance configured for production use.
 */
exports.ai = (0, genkit_1.genkit)({
    plugins: [(0, google_genai_1.googleAI)()],
    model: 'googleai/gemini-3.1-flash-lite',
});
/**
 * Centralized array of fallback models in order of preference.
 */
exports.FALLBACK_MODELS = [
    'googleai/gemini-3.1-flash-lite',
    'googleai/gemma-4-31b-it',
    'googleai/gemma-4-26b-a4b-it',
    'googleai/gemini-2.5-flash'
];
/**
 * Executes a Genkit generation with sequential fallback across multiple models.
 */
async function generateWithFallback(options, logInternal) {
    for (const model of exports.FALLBACK_MODELS) {
        try {
            if (logInternal)
                logInternal(`Attempting model: ${model}`);
            const res = await exports.ai.generate({ ...options, model });
            if (logInternal)
                logInternal(`Successfully used model: ${model}`);
            return res;
        }
        catch (e) {
            const errDetails = e.detail ? JSON.stringify(e.detail) : e.message;
            if (logInternal)
                logInternal(`Model ${model} failed with error: ${errDetails}`);
            console.warn(`Model ${model} failed:`, e);
        }
    }
    // If we reach here, all models failed
    throw new Error('All AI models failed to generate content or timed out. Please try again.');
}
/**
 * Executes an arbitrary AI prompt function with sequential fallback.
 * Useful for the frontend flows where we wrap prompts.
 */
async function executeWithFallback(promptFn, input) {
    for (const model of exports.FALLBACK_MODELS) {
        try {
            console.log(`Attempting model: ${model}`);
            const res = await promptFn(input, { model });
            if (res.output) {
                console.log(`Successfully used model: ${model}`);
                return res.output;
            }
        }
        catch (e) {
            console.warn(`Model ${model} failed:`, e);
        }
    }
    throw new Error('All AI models failed to generate content or timed out. Please try again.');
}
