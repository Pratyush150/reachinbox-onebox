// server/src/utils/emailUtils.ts

export function cleanEmailText(text: string): string {
  if (!text) return '';

  // Remove email threading/chain
  const cleanText = text
    // Remove "On [date] [name] wrote:" patterns
    .replace(/On\s+.+?wrote:\s*\n*/gi, '')
    // Remove forwarded message headers
    .replace(/---------- Forwarded message ---------/gi, '')
    .replace(/From:\s*.+?\n/gi, '')
    .replace(/Date:\s*.+?\n/gi, '')
    .replace(/Subject:\s*.+?\n/gi, '')
    .replace(/To:\s*.+?\n/gi, '')
    // Remove quote blocks (lines starting with >)
    .replace(/^>.*$/gm, '')
    // Remove multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim();

  // If the cleaned text is too short, return original
  if (cleanText.length < 20) {
    return text;
  }

  return cleanText;
}

export function extractEmailSnippet(text: string, maxLength: number = 150): string {
  const cleaned = cleanEmailText(text);
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  return cleaned.substring(0, maxLength).trim() + '...';
}

export function analyzeSalesOpportunity(email: any): {
  confidence: number;
  intent: string;
  urgency: 'high' | 'medium' | 'low';
  buyingSignals: string[];
  nextAction: string;
  responseStrategy: string;
} {
  const subject = (email.subject || '').toLowerCase();
  const body = (email.textBody || '').toLowerCase();
  const text = `${subject} ${body}`;

  let confidence = 0;
  const buyingSignals: string[] = [];
  let intent = 'unknown';
  let urgency: 'high' | 'medium' | 'low' = 'low';

  // High intent signals
  if (text.includes('budget')) {
    confidence += 30;
    buyingSignals.push('Mentioned budget');
  }
  if (text.includes('purchase') || text.includes('buy')) {
    confidence += 25;
    buyingSignals.push('Purchase intent');
  }
  if (text.includes('timeline') || text.includes('when')) {
    confidence += 20;
    buyingSignals.push('Timeline inquiry');
  }
  if (text.includes('pricing') || text.includes('cost') || text.includes('price')) {
    confidence += 20;
    buyingSignals.push('Pricing inquiry');
  }
  if (text.includes('demo') || text.includes('trial')) {
    confidence += 15;
    buyingSignals.push('Demo request');
  }
  if (text.includes('decision maker') || text.includes('approve')) {
    confidence += 25;
    buyingSignals.push('Decision maker involved');
  }

  // Medium intent signals
  if (text.includes('interested') || text.includes('learn more')) {
    confidence += 15;
    buyingSignals.push('Expressed interest');
  }
  if (text.includes('team') || text.includes('company')) {
    confidence += 10;
    buyingSignals.push('Company-wide consideration');
  }

  // Urgency indicators
  if (text.includes('urgent') || text.includes('asap') || text.includes('immediately')) {
    urgency = 'high';
    confidence += 15;
  } else if (text.includes('soon') || text.includes('quickly')) {
    urgency = 'medium';
    confidence += 10;
  }

  // Determine intent
  if (confidence > 50) {
    intent = 'high_purchase_intent';
  } else if (confidence > 25) {
    intent = 'moderate_interest';
  } else if (confidence > 10) {
    intent = 'early_stage_inquiry';
  } else {
    intent = 'low_engagement';
  }

  // Next action recommendations
  let nextAction = '';
  let responseStrategy = '';

  switch (intent) {
    case 'high_purchase_intent':
      nextAction = 'Schedule demo and send pricing immediately';
      responseStrategy = 'Direct, professional, focus on next steps';
      break;
    case 'moderate_interest':
      nextAction = 'Send case studies and schedule discovery call';
      responseStrategy = 'Educational, build value, gentle push';
      break;
    case 'early_stage_inquiry':
      nextAction = 'Provide educational content and stay in touch';
      responseStrategy = 'Informative, helpful, nurture relationship';
      break;
    default:
      nextAction = 'Send follow-up in 1 week';
      responseStrategy = 'Brief, friendly, leave door open';
  }

  return {
    confidence: Math.min(confidence, 100),
    intent,
    urgency,
    buyingSignals,
    nextAction,
    responseStrategy
  };
}
