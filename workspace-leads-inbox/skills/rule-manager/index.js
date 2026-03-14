const fs = require('fs');
const path = require('path');

const RULES_FILE = path.join(__dirname, '..', '..', 'RULES.md');

// Load existing rules
function loadRules() {
  try {
    if (fs.existsSync(RULES_FILE)) {
      return fs.readFileSync(RULES_FILE, 'utf8');
    }
  } catch (error) {
    console.error('[loadRules] Error:', error.message);
  }
  return '# Classification Rules\n\n';
}

// Save rules
function saveRules(content) {
  try {
    fs.writeFileSync(RULES_FILE, content, 'utf8');
    return true;
  } catch (error) {
    console.error('[saveRules] Error:', error.message);
    return false;
  }
}

// Parse rules into structured format
function parseRules(content) {
  const rules = {
    excludeStates: [],
    excludeCaseTypes: [],
    priorityKeywords: [],
    requireDocs: [],
    custom: []
  };
  
  const lines = content.split('\n');
  let currentSection = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## Exclude States')) {
      currentSection = 'excludeStates';
    } else if (trimmed.startsWith('## Exclude Case Types')) {
      currentSection = 'excludeCaseTypes';
    } else if (trimmed.startsWith('## Priority Keywords')) {
      currentSection = 'priorityKeywords';
    } else if (trimmed.startsWith('## Require Documents')) {
      currentSection = 'requireDocs';
    } else if (trimmed.startsWith('## Custom Rules')) {
      currentSection = 'custom';
    } else if (trimmed.startsWith('- ') && currentSection) {
      const item = trimmed.slice(2).trim();
      if (item) {
        rules[currentSection].push(item);
      }
    }
  }
  
  return rules;
}

// Add a rule
function addRule(rules, section, rule) {
  if (!rules[section]) return null;
  
  // Check if already exists
  if (rules[section].includes(rule)) {
    return rules;
  }
  
  rules[section].push(rule);
  return rules;
}

// Remove a rule
function removeRule(rules, section, rule) {
  if (!rules[section]) return null;
  
  const index = rules[section].findIndex(r => 
    r.toLowerCase() === rule.toLowerCase() ||
    r.toLowerCase().includes(rule.toLowerCase())
  );
  
  if (index === -1) return null;
  
  rules[section].splice(index, 1);
  return rules;
}

// Format rules back to markdown
function formatRules(rules) {
  let md = '# Classification Rules\n\n';
  md += 'These rules are updated dynamically from chat commands.\n\n';
  
  md += '## Exclude States\n';
  md += 'Do not accept cases from these states:\n';
  rules.excludeStates.forEach(r => md += `- ${r}\n`);
  if (!rules.excludeStates.length) md += '- (none)\n';
  md += '\n';
  
  md += '## Exclude Case Types\n';
  md += 'Do not accept these case types:\n';
  rules.excludeCaseTypes.forEach(r => md += `- ${r}\n`);
  if (!rules.excludeCaseTypes.length) md += '- (none)\n';
  md += '\n';
  
  md += '## Priority Keywords\n';
  md += 'High-priority cases contain these words:\n';
  rules.priorityKeywords.forEach(r => md += `- ${r}\n`);
  if (!rules.priorityKeywords.length) md += '- (none)\n';
  md += '\n';
  
  md += '## Require Documents\n';
  md += 'These documents are required for case acceptance:\n';
  rules.requireDocs.forEach(r => md += `- ${r}\n`);
  if (!rules.requireDocs.length) md += '- (none)\n';
  md += '\n';
  
  md += '## Custom Rules\n';
  md += 'Additional classification rules:\n';
  rules.custom.forEach(r => md += `- ${r}\n`);
  if (!rules.custom.length) md += '- (none)\n';
  
  return md;
}

module.exports = {
  name: "rule-manager",
  description: "Manage classification rules dynamically from chat",

  async execute({ command, context }) {
    const normalized = String(command || "").trim();
    const cmdParts = normalized.split(/\s+/);
    const cmd = cmdParts[0].toLowerCase();
    const args = cmdParts.slice(1);
    
    // /rule add [section] [rule]
    if (cmd === "/rule" && args[0] === "add") {
      if (args.length < 3) {
        return "Usage: /rule add [section] [rule]\n" +
               "Sections: states, case-types, keywords, docs, custom\n" +
               "Example: /rule add states Texas";
      }
      
      const sectionMap = {
        'states': 'excludeStates',
        'state': 'excludeStates',
        'case-types': 'excludeCaseTypes',
        'casetype': 'excludeCaseTypes',
        'keywords': 'priorityKeywords',
        'keyword': 'priorityKeywords',
        'docs': 'requireDocs',
        'documents': 'requireDocs',
        'custom': 'custom'
      };
      
      const section = sectionMap[args[1].toLowerCase()];
      if (!section) {
        return `Unknown section: ${args[1]}\nAvailable: states, case-types, keywords, docs, custom`;
      }
      
      const rule = args.slice(2).join(" ");
      
      const content = loadRules();
      const rules = parseRules(content);
      
      if (addRule(rules, section, rule)) {
        const newContent = formatRules(rules);
        if (saveRules(newContent)) {
          return `✓ Rule added to ${args[1]}: "${rule}"\n\nThe agent will now apply this rule to all future classifications.`;
        }
        return "Error saving rules.";
      }
      
      return `Rule already exists in ${args[1]}.`;
    }
    
    // /rule remove [section] [rule]
    if (cmd === "/rule" && args[0] === "remove") {
      if (args.length < 3) {
        return "Usage: /rule remove [section] [rule]\n" +
               "Example: /rule remove states Texas";
      }
      
      const sectionMap = {
        'states': 'excludeStates',
        'state': 'excludeStates',
        'case-types': 'excludeCaseTypes',
        'casetype': 'excludeCaseTypes',
        'keywords': 'priorityKeywords',
        'keyword': 'priorityKeywords',
        'docs': 'requireDocs',
        'documents': 'requireDocs',
        'custom': 'custom'
      };
      
      const section = sectionMap[args[1].toLowerCase()];
      if (!section) {
        return `Unknown section: ${args[1]}`;
      }
      
      const rule = args.slice(2).join(" ");
      
      const content = loadRules();
      const rules = parseRules(content);
      
      if (removeRule(rules, section, rule)) {
        const newContent = formatRules(rules);
        if (saveRules(newContent)) {
          return `✓ Rule removed from ${args[1]}: "${rule}"`;
        }
        return "Error saving rules.";
      }
      
      return `Rule not found in ${args[1]}.`;
    }
    
    // /rule list - Show all rules
    if (cmd === "/rule" && args[0] === "list") {
      const content = loadRules();
      const rules = parseRules(content);
      
      let response = "📋 Current Classification Rules:\n\n";
      
      response += "🚫 Exclude States:\n";
      rules.excludeStates.forEach(r => response += `  • ${r}\n`);
      if (!rules.excludeStates.length) response += "  (none)\n";
      
      response += "\n📁 Exclude Case Types:\n";
      rules.excludeCaseTypes.forEach(r => response += `  • ${r}\n`);
      if (!rules.excludeCaseTypes.length) response += "  (none)\n";
      
      response += "\n⭐ Priority Keywords:\n";
      rules.priorityKeywords.forEach(r => response += `  • ${r}\n`);
      if (!rules.priorityKeywords.length) response += "  (none)\n";
      
      response += "\n📄 Required Documents:\n";
      rules.requireDocs.forEach(r => response += `  • ${r}\n`);
      if (!rules.requireDocs.length) response += "  (none)\n";
      
      response += "\n⚙️ Custom Rules:\n";
      rules.custom.forEach(r => response += `  • ${r}\n`);
      if (!rules.custom.length) response += "  (none)\n";
      
      return response;
    }
    
    // /rule help
    if (cmd === "/rule" && args[0] === "help") {
      return `📋 Rule Management Commands:\n\n` +
        `/rule add [section] [rule] - Add a new rule\n` +
        `/rule remove [section] [rule] - Remove a rule\n` +
        `/rule list - Show all rules\n\n` +
        `Sections: states, case-types, keywords, docs, custom\n\n` +
        `Examples:\n` +
        `/rule add states Texas\n` +
        `/rule add keywords "accidente grave"\n` +
        `/rule add docs "reporte policial"\n` +
        `/rule remove states Texas`;
    }
    
    return `Unknown rule command. Use /rule help for options.`;
  },
};
