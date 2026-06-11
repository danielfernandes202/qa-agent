const fs = require('fs');
const path = require('path');

const flowsDir = path.join(__dirname, 'src', 'ai', 'flows');

const files = fs.readdirSync(flowsDir).filter(f => f.endsWith('.ts') && f !== 'generate-image-flow.ts' && f !== 'generate-test-cases.ts' && f !== 'draft-jira-bug-flow.ts' && f !== 'culinary-assistant-flow.ts');

files.forEach(file => {
  const filePath = path.join(flowsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // We want to replace this whole block:
  // const { output } = await ...Prompt(input);
  // if (!output) { ... }
  // return output;
  // OR 
  // const { output } = await ...Prompt(input);
  // return output || ...; // if they don't have an if block

  // Regex to match the prompt call
  const promptMatch = content.match(/const\s+\{\s*output\s*\}\s*=\s*await\s+([a-zA-Z0-9_]+Prompt)\(([^)]+)\);/);
  if (promptMatch) {
    const fullMatchStr = promptMatch[0];
    const promptName = promptMatch[1];
    const inputVar = promptMatch[2];

    // Find the boundary of the function
    const replaceStart = content.indexOf(fullMatchStr);
    const replaceEndRegex = /return\s+output;/;
    const endMatch = content.match(replaceEndRegex);
    
    if (endMatch) {
      // Find the specific end match that occurs after the start
      const afterStart = content.slice(replaceStart);
      const relativeEndMatch = afterStart.match(/return\s+(?:output|\[\]);/); // Sometimes it's return []; like in visual-analysis-flow
      
      if (relativeEndMatch) {
        // Find the index of the matched return statement
        const returnIndex = content.indexOf(relativeEndMatch[0], replaceStart);
        const replaceEnd = returnIndex + relativeEndMatch[0].length;
        
        const stringToReplace = content.slice(replaceStart, replaceEnd);
        
        let newContent = `return await executeWithFallback(${promptName}, ${inputVar});`;
        
        // Some flows return a default value if not output, executeWithFallback throws, which is fine to bubble up to the client or action handler.
        // Wait, for visual analysis:
        if (file === 'visual-analysis-flow.ts' || file === 'analyze-document-flow.ts') {
          newContent = `try {\n      return await executeWithFallback(${promptName}, ${inputVar});\n    } catch (e) {\n      console.warn('AI flow failed:', e);\n      return [];\n    }`;
        }
        
        content = content.replace(stringToReplace, newContent);
        console.log("Successfully refactored", file);
      }
    } else {
        console.log("End match not found in", file);
    }
  } else {
    console.log("Could not match prompt call pattern in", file);
  }

  fs.writeFileSync(filePath, content, 'utf8');
});
