// server/src/utils/emailUtils.ts

export function cleanEmailText(text: string): string {
  if (!text) return '';

  // Less aggressive cleaning - preserve threading but clean formatting
  const cleanText = text
    // Remove excessive newlines but preserve structure
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove leading/trailing whitespace only
    .trim();

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
  const senderName = email.from?.name || email.from?.address?.split('@')[0] || 'the prospect';

  let confidence = 0;
  const buyingSignals: string[] = [];
  let intent = 'unknown';
  let urgency: 'high' | 'medium' | 'low' = 'low';

  // FIXED: More accurate signals with weighted scoring
  
  // High-intent signals (25-35 points each)
  if (text.includes('budget approved') || text.includes('funds allocated')) {
    confidence += 35;
    buyingSignals.push('Budget approved');
  }
  if (text.includes('ready to purchase') || text.includes('ready to buy') || text.includes('want to proceed')) {
    confidence += 30;
    buyingSignals.push('Ready to purchase');
  }
  if (text.includes('decision maker') || text.includes('ceo') || text.includes('manager approved')) {
    confidence += 25;
    buyingSignals.push('Decision maker involved');
  }
  if (text.includes('contract') || text.includes('agreement') || text.includes('paperwork')) {
    confidence += 25;
    buyingSignals.push('Contract discussion');
  }

  // Medium-high signals (15-20 points each)
  if (text.includes('pricing') || text.includes('cost') || text.includes('price') || text.includes('quote')) {
    confidence += 20;
    buyingSignals.push('Pricing inquiry');
  }
  if (text.includes('timeline') || text.includes('when can we start') || text.includes('implementation')) {
    confidence += 18;
    buyingSignals.push('Timeline discussion');
  }
  if (text.includes('demo impressed') || text.includes('demo was great') || text.includes('liked the demo')) {
    confidence += 15;
    buyingSignals.push('Positive demo feedback');
  }

  // Medium signals (8-15 points each)
  if (text.includes('demo') || text.includes('trial') || text.includes('test')) {
    confidence += 12;
    buyingSignals.push('Demo/trial request');
  }
  if (text.includes('features') || text.includes('capabilities') || text.includes('functionality')) {
    confidence += 10;
    buyingSignals.push('Feature inquiry');
  }
  if (text.includes('team size') || text.includes('users') || text.includes('licenses')) {
    confidence += 8;
    buyingSignals.push('Sizing discussion');
  }

  // Low signals (3-8 points each)
  if (text.includes('interested') || text.includes('learn more')) {
    confidence += 8;
    buyingSignals.push('Expressed interest');
  }
  if (text.includes('company') || text.includes('organization')) {
    confidence += 5;
    buyingSignals.push('Company-wide consideration');
  }

  // Negative signals (reduce confidence)
  if (text.includes('not interested') || text.includes('no longer need')) {
    confidence -= 50;
    buyingSignals.push('Declined interest');
  }
  if (text.includes('unsubscribe') || text.includes('remove me')) {
    confidence -= 40;
    buyingSignals.push('Wants to unsubscribe');
  }

  // FIXED: Better urgency detection
  if (text.includes('urgent') || text.includes('asap') || text.includes('immediately') || text.includes('today')) {
    urgency = 'high';
    confidence += 15;
  } else if (text.includes('soon') || text.includes('this week') || text.includes('quickly') || text.includes('fast')) {
    urgency = 'medium';
    confidence += 8;
  } else if (text.includes('no rush') || text.includes('whenever') || text.includes('future')) {
    urgency = 'low';
  } else if (confidence > 40) {
    urgency = 'medium'; // Default to medium if high confidence
  }

  // FIXED: Better intent categorization
  confidence = Math.max(0, Math.min(confidence, 100)); // Clamp between 0-100

  if (confidence > 70) {
    intent = 'ready_to_buy';
  } else if (confidence > 45) {
    intent = 'strong_interest';
  } else if (confidence > 20) {
    intent = 'evaluating_options';
  } else if (confidence > 5) {
    intent = 'early_inquiry';
  } else {
    intent = 'low_engagement';
  }

  // FIXED: Contextual next actions based on specific signals
  let nextAction = '';
  let responseStrategy = '';

  // Determine next action based on intent and specific signals
  if (text.includes('budget approved') || text.includes('ready to purchase')) {
    nextAction = `Send contract and implementation timeline to ${senderName} immediately`;
    responseStrategy = 'Direct and action-oriented - focus on closing the deal';
  } else if (text.includes('pricing') || text.includes('quote')) {
    nextAction = `Send detailed pricing proposal to ${senderName} within 2 hours`;
    responseStrategy = 'Professional pricing presentation with value justification';
  } else if (text.includes('demo') && confidence > 50) {
    nextAction = `Schedule personalized demo for ${senderName} this week`;
    responseStrategy = 'Focus on their specific use case and pain points';
  } else if (text.includes('timeline') || text.includes('implementation')) {
    nextAction = `Provide implementation roadmap and onboarding plan to ${senderName}`;
    responseStrategy = 'Detailed project planning to address timeline concerns';
  } else if (text.includes('not interested') || text.includes('unsubscribe')) {
    nextAction = `Acknowledge ${senderName}'s decision and offer future contact option`;
    responseStrategy = 'Gracious and professional - leave door open for future';
  } else if (confidence > 60) {
    nextAction = `Schedule discovery call with ${senderName} to discuss next steps`;
    responseStrategy = 'Consultative approach to understand needs and timeline';
  } else if (confidence > 30) {
    nextAction = `Send case study and schedule follow-up call with ${senderName}`;
    responseStrategy = 'Educational content to build value and trust';
  } else if (confidence > 10) {
    nextAction = `Provide helpful resources to ${senderName} and schedule check-in`;
    responseStrategy = 'Nurturing approach with valuable content sharing';
  } else {
    nextAction = `Add ${senderName} to nurturing sequence and follow up in 2 weeks`;
    responseStrategy = 'Light touch follow-up to stay on their radar';
  }

  // Meeting-specific actions
  if (text.includes('meeting confirmed') || text.includes('calendar invite')) {
    nextAction = `Prepare meeting materials and send agenda to ${senderName}`;
    responseStrategy = 'Professional meeting preparation with clear objectives';
  }

  // Out of office handling
  if (text.includes('out of office') || text.includes('vacation')) {
    nextAction = `Add reminder to follow up with ${senderName} after their return`;
    responseStrategy = 'Respectful acknowledgment with future follow-up plan';
  }

  return {
    confidence,
    intent,
    urgency,
    buyingSignals,
    nextAction,
    responseStrategy
  };
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
