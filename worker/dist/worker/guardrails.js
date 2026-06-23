"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkGuardrails = checkGuardrails;
async function checkGuardrails(toolName, args, sessionState) {
    // 1. Navigation boundary check
    if (toolName.startsWith('navigateTool')) {
        const targetHost = new URL(sessionState.targetUrl).hostname;
        try {
            const destHost = new URL(args.url).hostname;
            if (destHost !== targetHost && !destHost.endsWith('.' + targetHost)) {
                throw new Error(`Guardrail violation: Navigation to external domain ${destHost} is not allowed. Only ${targetHost} is allowed.`);
            }
        }
        catch (e) {
            if (e.message.includes('Guardrail violation'))
                throw e;
            throw new Error(`Guardrail violation: Invalid URL format: ${args.url}`);
        }
    }
    // 2. Repetitive loop check
    const recentActions = sessionState.actionHistory.slice(-3);
    if (recentActions.length === 3) {
        const isLoop = recentActions.every(a => a.toolName === toolName && JSON.stringify(a.args) === JSON.stringify(args));
        if (isLoop) {
            throw new Error(`Guardrail violation: Detected repetitive loop for tool ${toolName} with identical arguments. Please try a different action or strategy.`);
        }
    }
}
