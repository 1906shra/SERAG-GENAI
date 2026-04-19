const logger = require('../utils/logger');

class ChunkingService {
  constructor() {
    this.defaultChunkSize = 1000; // characters
    this.defaultChunkOverlap = 200; // characters
    this.minChunkSize = 100;
    this.maxChunkSize = 2000;
  }

  /**
   * Split document into chunks with overlap
   */
  chunkDocument(content, options = {}) {
    try {
      const {
        chunkSize = this.defaultChunkSize,
        chunkOverlap = this.defaultChunkOverlap,
        separator = '\n',
        minChunkSize = this.minChunkSize,
        maxChunkSize = this.maxChunkSize
      } = options;

      // Validate parameters
      if (chunkSize < minChunkSize || chunkSize > maxChunkSize) {
        throw new Error(`Chunk size must be between ${minChunkSize} and ${maxChunkSize}`);
      }

      if (chunkOverlap >= chunkSize) {
        throw new Error('Chunk overlap must be less than chunk size');
      }

      // Clean and prepare content
      const cleanedContent = this.cleanContent(content);
      
      // Split content into paragraphs first
      const paragraphs = this.splitIntoParagraphs(cleanedContent, separator);
      
      // Create chunks with overlap
      const chunks = this.createChunks(paragraphs, chunkSize, chunkOverlap);
      
      // Add metadata to each chunk
      const enrichedChunks = chunks.map((chunk, index) => ({
        text: chunk.text,
        metadata: {
          chunkIndex: index,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          wordCount: chunk.text.split(/\s+/).length,
          charCount: chunk.text.length,
          paragraphCount: chunk.paragraphCount
        }
      }));

      logger.info(`Document chunked into ${enrichedChunks.length} chunks`);
      
      return enrichedChunks;
    } catch (error) {
      logger.error('Chunking error:', error);
      throw new Error(`Failed to chunk document: ${error.message}`);
    }
  }

  /**
   * Clean content for better chunking
   */
  cleanContent(content) {
    return content
      // Normalize whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      // Trim
      .trim();
  }

  /**
   * Split content into paragraphs
   */
  splitIntoParagraphs(content, separator = '\n') {
    const paragraphs = content
      .split(separator)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return paragraphs;
  }

  /**
   * Create chunks from paragraphs with overlap
   */
  createChunks(paragraphs, chunkSize, chunkOverlap) {
    const chunks = [];
    let currentChunk = '';
    let startIndex = 0;
    let paragraphCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

      // If adding this paragraph exceeds chunk size, create a chunk
      if (potentialChunk.length > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          startIndex,
          endIndex: startIndex + currentChunk.length,
          paragraphCount
        });

        // Calculate overlap for next chunk
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + '\n\n' + paragraph;
        startIndex = startIndex + currentChunk.length - overlapText.length - paragraph.length - 2;
        paragraphCount = overlapText ? 1 : 0; // Count overlap as one paragraph
        paragraphCount++;
      } else {
        // Add paragraph to current chunk
        currentChunk = potentialChunk;
        paragraphCount++;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length,
        paragraphCount
      });
    }

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) {
      return text;
    }

    // Try to break at sentence boundary
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let overlapText = '';
    
    // Build overlap from the end
    for (let i = sentences.length - 1; i >= 0; i--) {
      const candidate = sentences.slice(i).join('').trim();
      
      if (candidate.length <= overlapSize) {
        overlapText = candidate;
      } else {
        break;
      }
    }

    // If no good sentence boundary found, use character-based overlap
    if (!overlapText) {
      overlapText = text.slice(-overlapSize).trim();
    }

    return overlapText;
  }

  /**
   * Semantic chunking based on content structure
   */
  semanticChunking(content, options = {}) {
    try {
      const {
        maxChunkSize = this.defaultChunkSize,
        minChunkSize = this.minChunkSize,
        semanticThreshold = 0.8
      } = options;

      // Split by headings and paragraphs
      const sections = this.extractSections(content);
      const chunks = [];

      for (const section of sections) {
        if (section.content.length <= maxChunkSize) {
          chunks.push({
            text: section.content.trim(),
            metadata: {
              chunkIndex: chunks.length,
              startIndex: section.startIndex,
              endIndex: section.endIndex,
              wordCount: section.content.split(/\s+/).length,
              charCount: section.content.length,
              heading: section.heading,
              level: section.level
            }
          });
        } else {
          // Split large sections recursively
          const subChunks = this.chunkDocument(section.content, {
            chunkSize: maxChunkSize,
            chunkOverlap: Math.floor(maxChunkSize * 0.2)
          });

          subChunks.forEach(subChunk => {
            chunks.push({
              text: subChunk.text,
              metadata: {
                ...subChunk.metadata,
                heading: section.heading,
                level: section.level
              }
            });
          });
        }
      }

      return chunks;
    } catch (error) {
      logger.error('Semantic chunking error:', error);
      // Fallback to regular chunking
      return this.chunkDocument(content, options);
    }
  }

  /**
   * Extract sections from document based on headings
   */
  extractSections(content) {
    const sections = [];
    const headingPattern = /^(#{1,6})\s+(.+)$/gm;
    let match;
    let lastIndex = 0;
    let currentHeading = null;
    let currentLevel = 0;

    while ((match = headingPattern.exec(content)) !== null) {
      // Save previous section
      if (currentHeading && lastIndex < match.index) {
        const sectionContent = content.substring(lastIndex, match.index).trim();
        if (sectionContent.length > 0) {
          sections.push({
            heading: currentHeading,
            level: currentLevel,
            content: sectionContent,
            startIndex: lastIndex,
            endIndex: match.index
          });
        }
      }

      // Update current heading
      currentHeading = match[2].trim();
      currentLevel = match[1].length;
      lastIndex = match.index + match[0].length;
    }

    // Add last section
    if (currentHeading && lastIndex < content.length) {
      const sectionContent = content.substring(lastIndex).trim();
      if (sectionContent.length > 0) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: sectionContent,
          startIndex: lastIndex,
          endIndex: content.length
        });
      }
    }

    // If no headings found, treat entire content as one section
    if (sections.length === 0) {
      sections.push({
        heading: null,
        level: 0,
        content: content.trim(),
        startIndex: 0,
        endIndex: content.length
      });
    }

    return sections;
  }

  /**
   * Get optimal chunk size based on content
   */
  getOptimalChunkSize(content, targetChunks = 10) {
    const contentLength = content.length;
    const estimatedChunkSize = Math.ceil(contentLength / targetChunks);

    // Clamp to reasonable bounds
    return Math.max(
      this.minChunkSize,
      Math.min(this.maxChunkSize, estimatedChunkSize)
    );
  }

  /**
   * Validate chunks
   */
  validateChunks(chunks) {
    const errors = [];

    chunks.forEach((chunk, index) => {
      if (!chunk.text || chunk.text.trim().length === 0) {
        errors.push(`Chunk ${index}: Empty text`);
      }

      if (chunk.text.length < this.minChunkSize) {
        errors.push(`Chunk ${index}: Too short (${chunk.text.length} chars)`);
      }

      if (chunk.text.length > this.maxChunkSize) {
        errors.push(`Chunk ${index}: Too long (${chunk.text.length} chars)`);
      }

      if (!chunk.metadata || chunk.metadata.chunkIndex === undefined) {
        errors.push(`Chunk ${index}: Missing metadata`);
      }
    });

    return errors;
  }
}

module.exports = ChunkingService;
