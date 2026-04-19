const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class DocumentService {
  constructor() {
    this.supportedTypes = ['text', 'pdf', 'docx', 'url'];
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
  }

  /**
   * Process uploaded file or URL and extract text content
   */
  async processDocument(filePath, contentType, source) {
    try {
      let content = '';
      let metadata = {};

      switch (contentType) {
        case 'text':
          content = await this.processTextFile(filePath);
          break;
        case 'pdf':
          const pdfData = await this.processPDF(filePath);
          content = pdfData.text;
          metadata = pdfData.metadata;
          break;
        case 'docx':
          const docxData = await this.processDocx(filePath);
          content = docxData.text;
          metadata = docxData.metadata;
          break;
        case 'url':
          const urlData = await this.processURL(source);
          content = urlData.text;
          metadata = urlData.metadata;
          break;
        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }

      return {
        content: content.trim(),
        metadata: {
          ...metadata,
          wordCount: content.split(/\s+/).length,
          fileSize: contentType === 'url' ? 0 : (await fs.stat(filePath)).size
        }
      };
    } catch (error) {
      logger.error('Document processing error:', error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Process plain text file
   */
  async processTextFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }

  /**
   * Process PDF file
   */
  async processPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);

      return {
        text: data.text,
        metadata: {
          pageCount: data.numpages,
          info: data.info || {},
          language: this.detectLanguage(data.text)
        }
      };
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Process DOCX file
   */
  async processDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      return {
        text: result.value,
        metadata: {
          language: this.detectLanguage(result.value),
          warnings: result.messages
        }
      };
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
  }

  /**
   * Process URL and extract content
   */
  async processURL(url) {
    try {
      // Validate URL
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      // Fetch content with timeout
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Search-Engine/1.0)'
        }
      });

      // Parse HTML and extract text
      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, header, footer, aside').remove();
      
      // Extract main content
      const title = $('title').text().trim() || url;
      const content = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();

      if (!content) {
        throw new Error('No content found on the page');
      }

      return {
        text: content,
        metadata: {
          title,
          url,
          language: this.detectLanguage(content),
          contentType: response.headers['content-type'],
          statusCode: response.status
        }
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to reach the URL');
      }
      throw new Error(`URL processing failed: ${error.message}`);
    }
  }

  /**
   * Detect language of text content
   */
  detectLanguage(text) {
    // Simple language detection based on common words
    const sample = text.substring(0, 1000).toLowerCase();
    
    const patterns = {
      'en': /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/,
      'es': /\b(el|la|y|o|pero|en|de|para|con|por)\b/,
      'fr': /\b(le|la|et|ou|mais|dans|de|pour|avec|par)\b/,
      'de': /\b(der|die|das|und|oder|aber|in|zu|für|mit|von)\b/
    };

    let maxScore = 0;
    let detectedLang = 'en';

    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = sample.match(pattern);
      const score = matches ? matches.length : 0;
      
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    return detectedLang;
  }

  /**
   * Validate file before processing
   */
  async validateFile(filePath, contentType) {
    try {
      if (!this.supportedTypes.includes(contentType)) {
        throw new Error(`Unsupported file type: ${contentType}`);
      }

      if (contentType !== 'url') {
        const stats = await fs.stat(filePath);
        
        if (stats.size > this.maxFileSize) {
          throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
        }

        if (stats.size === 0) {
          throw new Error('File is empty');
        }
      }

      return true;
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }

  /**
   * Clean and normalize text content
   */
  cleanText(text) {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters but keep basic punctuation
      .replace(/[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}\"\'\/\\]/g, '')
      // Remove multiple punctuation
      .replace(/([.!?])\1+/g, '$1')
      // Trim whitespace
      .trim();
  }

  /**
   * Extract title from content
   */
  extractTitle(content, source) {
    // Try to find first line as title
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length > 0 && lines[0].length < 200) {
      return lines[0].trim();
    }

    // Fallback to filename or URL
    if (source) {
      const parts = source.split(/[\/\\]/);
      return parts[parts.length - 1] || 'Untitled Document';
    }

    return 'Untitled Document';
  }

  /**
   * Generate summary of content
   */
  generateSummary(content, maxLength = 200) {
    const cleaned = this.cleanText(content);
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    // Find the best sentence break point
    const sentences = cleaned.split(/[.!?]/);
    let summary = '';
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length > maxLength) {
        break;
      }
      summary += sentence + '. ';
    }

    return summary.trim() || cleaned.substring(0, maxLength) + '...';
  }
}

module.exports = DocumentService;
