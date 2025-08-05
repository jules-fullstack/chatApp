import dotenv from 'dotenv';

dotenv.config();

interface HunterValidationResponse {
  data: {
    result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
    score: number;
    email: string;
    regexp: boolean;
    gibberish: boolean;
    disposable: boolean;
    webmail: boolean;
    mx_records: boolean;
    smtp_server: boolean;
    smtp_check: boolean;
    accept_all: boolean;
    block: boolean;
  };
}

interface EmailValidationResult {
  isValid: boolean;
  score: number;
  result: string;
  reasons: string[];
  email: string;
}

export class EmailValidationService {
  private apiKey: string;
  private baseUrl = 'https://api.hunter.io/v2/email-verifier';

  constructor() {
    this.apiKey = process.env.HUNTER_API_KEY!;
    if (!this.apiKey) {
      throw new Error('HUNTER_API_KEY is required in environment variables');
    }
  }

  async validateEmail(email: string): Promise<EmailValidationResult> {
    try {
      // Basic email format validation first
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          isValid: false,
          score: 0,
          result: 'invalid_format',
          reasons: ['Invalid email format'],
          email
        };
      }

      const url = new URL(this.baseUrl);
      url.searchParams.append('email', email);
      url.searchParams.append('api_key', this.apiKey);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Echo-ChatApp/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Hunter.io API error: ${response.status} ${response.statusText}`);
      }

      const apiResponse = await response.json() as HunterValidationResponse;
      const data = apiResponse.data;
      const reasons: string[] = [];

      // Analyze the response
      if (data.disposable) {
        reasons.push('Disposable email address');
      }
      
      if (data.gibberish) {
        reasons.push('Gibberish or random email address');
      }
      
      if (data.block) {
        reasons.push('Email is blocked');
      }
      
      if (!data.mx_records) {
        reasons.push('No MX records found');
      }
      
      if (!data.smtp_server) {
        reasons.push('SMTP server not reachable');
      }

      // Determine if email is valid based on Hunter.io result and score
      const isValid = this.determineValidityFromHunterResult(data.result, data.score, reasons);

      return {
        isValid,
        score: data.score,
        result: data.result,
        reasons,
        email: data.email
      };

    } catch (error) {
      console.error('Email validation error:', error);
      
      // If Hunter.io is down or rate limited, fall back to basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isBasicValid = emailRegex.test(email);
      
      return {
        isValid: isBasicValid,
        score: isBasicValid ? 50 : 0, // Neutral score for fallback
        result: 'fallback_validation',
        reasons: isBasicValid ? ['Basic format validation only'] : ['Invalid email format'],
        email
      };
    }
  }

  private determineValidityFromHunterResult(
    result: string, 
    score: number, 
    reasons: string[]
  ): boolean {
    // Deliverable emails are always valid
    if (result === 'deliverable') {
      return true;
    }
    
    // Undeliverable emails are never valid
    if (result === 'undeliverable') {
      return false;
    }
    
    // For risky and unknown results, use score and specific checks
    if (result === 'risky') {
      // Accept risky emails with high score and no major red flags
      return score >= 70 && !reasons.some(reason => 
        reason.includes('Disposable') || 
        reason.includes('blocked') || 
        reason.includes('Gibberish')
      );
    }
    
    if (result === 'unknown') {
      // Accept unknown emails with decent score and basic email infrastructure
      return score >= 50 && !reasons.some(reason => 
        reason.includes('No MX records') || 
        reason.includes('SMTP server not reachable')
      );
    }
    
    return false;
  }

  async validateBatch(emails: string[]): Promise<EmailValidationResult[]> {
    // Validate emails in parallel but with some rate limiting
    const batchSize = 5; // Validate 5 emails at a time
    const results: EmailValidationResult[] = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => this.validateEmail(email));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}

export const emailValidationService = new EmailValidationService();