/**
 * 转换功能模块
 * 包含Markdown格式转换和Logseq块处理相关功能
 */

/**
 * 将 Markdown 转换为带缩进的格式
 * 
 * @param {string} mdContent - Markdown 内容
 * @returns {string} - 转换后的内容
 */
export function convertMdFormat(mdContent) {
  const lines = mdContent.trim().split('\n');
  if (!lines.length) {
    return '';
  }

  const convertedLines = [];
  const realHeaderStack = []; // 真实h标签栈
  let lastRealHeaderLevel = 0; // 最近的真h标签层级
  let lastPseudoHeader = null; // 最近的伪h标签信息 {type: 'bold'|'code', level: number}
  let inCodeBlock = false; // 跟踪是否在代码块内
  let inTable = false; // 跟踪是否在表格内
  let tableIndent = ''; // 记录表格的缩进
  let codeBlockIndent = ''; // 记录代码块的缩进

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let stripped = line.trim();
    
    // 移除logseq可能添加的'- '前缀
    if (stripped.startsWith('- ')) {
      stripped = stripped.substring(2).trim();
    }
    
    // 检查代码块标记
    if (stripped.startsWith('```')) {
      if (!inCodeBlock) {
        // 开始代码块
        inCodeBlock = true;
        codeBlockIndent = '\t'.repeat(realHeaderStack.length);
        convertedLines.push(`${codeBlockIndent}- ${stripped}`);
      } else {
        // 结束代码块
        inCodeBlock = false;
        convertedLines.push(`${codeBlockIndent}${stripped}`);
        codeBlockIndent = '';
      }
      continue;
    }
    
    // 如果在代码块内，保持原有格式，不添加'- '前缀和额外缩进
    if (inCodeBlock) {
      // 移除可能的logseq添加的'- '前缀，但保持代码的原始缩进
      let codeLine = line;
      if (codeLine.trim().startsWith('- ')) {
        codeLine = codeLine.replace(/^(\s*)- /, '$1');
      }
      convertedLines.push(codeLine);
      continue;
    }
    
    // 检查表格行（以|开头或包含|的行）
    if (stripped.includes('|') && stripped.trim() !== '') {
      if (!inTable) {
        // 开始表格
        inTable = true;
        tableIndent = '\t'.repeat(realHeaderStack.length);
        convertedLines.push(`${tableIndent}- ${stripped}`);
      } else {
        // 表格内容行，不添加'- '前缀
        convertedLines.push(`${tableIndent}${stripped}`);
      }
      continue;
    } else if (inTable && stripped.trim() === '') {
      // 表格后的空行，结束表格
      inTable = false;
      convertedLines.push('');
      tableIndent = '';
      continue;
    } else if (inTable) {
      // 非表格行出现，结束表格
      inTable = false;
      tableIndent = '';
    }
    
    // 跳过空行
    if (!stripped) {
      convertedLines.push('');
      continue;
    }

    // 计算当前行的标题级别
    let level = 0;
    let prefix = '';
    let tempStripped = stripped;
    let isSpecialTitle = false;
    
    // 检查是否为标准标题格式（#开头）
    while (tempStripped.startsWith('#')) {
      level++;
      prefix += '#';
      tempStripped = tempStripped.substring(1).trim();
    }
    
    // 检查是否为特殊标题格式：**xxx**：或`xxxxx`：
    if (level === 0) {
      const boldTitlePattern = /^\*\*[^*]+\*\*：/;
      const codeTitlePattern = /^`[^`]+`(?:\/`[^`]+`)*：/;
      
      if (boldTitlePattern.test(stripped) || codeTitlePattern.test(stripped)) {
        isSpecialTitle = true;
        const isBoldTitle = boldTitlePattern.test(stripped);
        const isCodeTitle = codeTitlePattern.test(stripped);
        const currentPseudoType = isBoldTitle ? 'bold' : 'code';
        
        // 伪标题的层级设置逻辑
        if (lastPseudoHeader) {
          // 有上一个伪标题
          if (lastPseudoHeader.type === currentPseudoType) {
            // 同类型伪标签
            if (isBoldTitle) {
              // **xxx**：同类型找真标签
              level = lastRealHeaderLevel + 1;
            } else {
              // `xxxx`：同类型找**xxx**：伪标签
              level = lastPseudoHeader.level;
            }
          } else {
            // 不同类型，`xxxx`：优先级低于**xxx**：
            if (isCodeTitle) {
              // 当前是code类型，优先级低，为下一级
              level = lastPseudoHeader.level + 1;
            } else {
              // 当前是bold类型，优先级高，与真标签同级
              level = lastRealHeaderLevel + 1;
            }
          }
        } else {
          // 没有上一个伪标题，基于最近的真标签
          level = lastRealHeaderLevel + 1;
        }
        
        // 更新最近的伪标题信息
        lastPseudoHeader = {type: currentPseudoType, level: level};
      }
    }

    if (level > 0) { // 如果是标题行（包括特殊标题）
      if (level === 1 && !isSpecialTitle) {
        // 一级标题保持原样，不添加缩进和前缀
        convertedLines.push(stripped);
        realHeaderStack.length = 0; // 清空真标题栈
        realHeaderStack.push(level);
        lastRealHeaderLevel = level;
        lastPseudoHeader = null; // 重置伪标题
      } else if (!isSpecialTitle) {
        // 真实标题处理
        // 调整真标题栈，移除比当前级别深的所有标题
        while (realHeaderStack.length && level <= realHeaderStack[realHeaderStack.length - 1]) {
          realHeaderStack.pop();
        }
        realHeaderStack.push(level);
        lastRealHeaderLevel = level;
        lastPseudoHeader = null; // 重置伪标题

        // 缩进量为当前层级深度减1（因为一级标题不计入缩进）
        const indent = '\t'.repeat(realHeaderStack.length - 1);
        convertedLines.push(`${indent}- ${stripped}`);
      } else {
        // 伪标题处理
        // 缩进量基于真标题栈深度加上伪标题的相对层级
        const baseIndent = realHeaderStack.length;
        const pseudoIndent = level - lastRealHeaderLevel - 1;
        const indent = '\t'.repeat(baseIndent + pseudoIndent);
        convertedLines.push(`${indent}- ${stripped}`);
      }
    } else { // 非标题行
      // 缩进量基于当前的层级状态
      let currentDepth = realHeaderStack.length;
      if (lastPseudoHeader) {
        currentDepth += (lastPseudoHeader.level - lastRealHeaderLevel);
      }
      const indent = '\t'.repeat(currentDepth);
      convertedLines.push(`${indent}- ${stripped}`);
    }
  }

  return convertedLines.join('\n');
}

/**
 * 将Logseq块结构转换为Markdown
 * 
 * @param {Array} blocks - Logseq块数组
 * @returns {string} - 转换后的Markdown内容
 */
export function blocksToMarkdown(blocks) {
  let markdown = '';
  let inCodeBlock = false;
  
  for (const block of blocks) {
    if (block.content) {
      let content = block.content.trim();
      
      // 检查代码块开始/结束
      if (content.includes('```')) {
        inCodeBlock = !inCodeBlock;
      }
      
      // 移除可能的'- '前缀，但对代码块内容特殊处理
      if (content.startsWith('- ')) {
        if (inCodeBlock || content.includes('```')) {
          // 对于代码块内容，只移除'- '但保持原始缩进
          content = content.replace(/^- /, '');
        } else {
          content = content.substring(2).trim();
        }
      }
      
      // 过滤掉分隔线（---）
      if (content.trim() === '---') {
        continue;
      }
      
      // 直接添加内容，不添加额外的标题标记
      markdown += content + '\n';
    }
    
    // 递归处理子块
    if (block.children && block.children.length > 0) {
      markdown += blocksToMarkdown(block.children);
    }
  }
  
  return markdown;
}

/**
 * 提取Logseq块内容
 * 
 * @param {Array} blocks - Logseq块数组
 * @param {number} depth - 当前递归深度
 * @param {number} maxDepth - 最大递归深度
 * @param {Set} visited - 已访问的块UUID集合
 * @returns {string} - 提取的内容
 */
export function extractContent(blocks, depth = 0, maxDepth = 10, visited = new Set()) {
  if (depth > maxDepth) {
    console.warn('达到最大递归深度，停止处理');
    return '';
  }
  
  let content = '';
  for (const block of blocks) {
    // 防止循环引用
    if (visited.has(block.uuid)) {
      continue;
    }
    visited.add(block.uuid);
    
    if (block.content) {
      // 移除logseq自动添加的'- '前缀
      let cleanContent = block.content;
      if (cleanContent.startsWith('- ')) {
        cleanContent = cleanContent.substring(2);
      }
      content += cleanContent + '\n';
    }
    
    if (block.children && block.children.length > 0) {
      content += extractContent(block.children, depth + 1, maxDepth, visited);
    }
    
    visited.delete(block.uuid);
  }
  return content;
}