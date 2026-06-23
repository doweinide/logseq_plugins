/**
 * 工具函数模块
 * 包含页面操作、块处理等通用工具函数
 */

/**
 * 获取当前页面信息
 * 
 * @returns {Promise<Object|null>} - 当前页面对象或null
 */
export async function getCurrentPage() {
  try {
    const currentPage = await logseq.Editor.getCurrentPage();
    return currentPage;
  } catch (error) {
    console.error('获取当前页面失败:', error);
    return null;
  }
}

/**
 * 获取页面的所有块
 * 
 * @param {string} pageName - 页面名称
 * @returns {Promise<Array|null>} - 块数组或null
 */
export async function getPageBlocks(pageName) {
  try {
    const blocks = await logseq.Editor.getPageBlocksTree(pageName);
    return blocks;
  } catch (error) {
    console.error('获取页面块失败:', error);
    return null;
  }
}

/**
 * 显示消息提示
 * 
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 ('info', 'success', 'warning', 'error')
 */
export function showMessage(message, type = 'info') {
  logseq.App.showMsg(message, type);
}

/**
 * 获取行的缩进层级
 *
 * @param {string} line - 当前行
 * @param {'indent'|'markdown'} contentMode - 内容模式
 * @returns {number} - 缩进层级
 */
function getLineIndentLevel(line, contentMode) {
  if (contentMode !== 'indent') {
    return 0;
  }

  const indentMatch = line.match(/^(\t*)/);
  return indentMatch ? indentMatch[1].length : 0;
}

/**
 * 提取当前行的有效内容
 *
 * @param {string} line - 当前行
 * @param {'indent'|'markdown'} contentMode - 内容模式
 * @returns {string} - 行内容
 */
function extractLineContent(line, contentMode) {
  if (contentMode === 'indent') {
    return line.replace(/^\t*- /, '').trim();
  }

  return line.trim();
}

/**
 * 将文本内容解析为批量插入所需的块树结构
 *
 * @param {string} rawContent - 原始内容
 * @param {'indent'|'markdown'} contentMode - 内容模式
 * @returns {Array} - Logseq 批量插入块结构
 */
function buildBatchBlocksFromContent(rawContent, contentMode = 'indent') {
  const lines = rawContent.split('\n');
  const roots = [];
  const blockStack = [];

  const pushBlock = (indentLevel, content) => {
    const normalizedIndentLevel = Math.min(indentLevel, blockStack.length);
    const block = { content };

    while (blockStack.length > normalizedIndentLevel) {
      blockStack.pop();
    }

    if (normalizedIndentLevel === 0) {
      roots.push(block);
    } else {
      const parent = blockStack[normalizedIndentLevel - 1];
      if (!parent) {
        roots.push(block);
      } else {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(block);
      }
    }

    blockStack[normalizedIndentLevel] = block;
    blockStack.length = normalizedIndentLevel + 1;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const indentLevel = getLineIndentLevel(line, contentMode);
    let content = extractLineContent(line, contentMode);

    if (!content) {
      i++;
      continue;
    }

    if (content.startsWith('```')) {
      let codeBlock = content + '\n';
      i++;

      while (i < lines.length) {
        const codeLine = lines[i];
        codeBlock += codeLine + '\n';

        if (codeLine.trim().startsWith('```')) {
          break;
        }

        i++;
      }

      pushBlock(indentLevel, codeBlock.trim());
      i++;
      continue;
    }

    if (content.includes('|')) {
      let tableBlock = content + '\n';
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextContent = extractLineContent(nextLine, contentMode);

        if (nextContent && nextContent.includes('|')) {
          tableBlock += nextContent + '\n';
          i++;
          continue;
        }

        break;
      }

      pushBlock(indentLevel, tableBlock.trim());
      continue;
    }

    pushBlock(indentLevel, content);
    i++;
  }

  return roots;
}

/**
 * 逐块插入内容，作为批量插入不可用时的兼容回退
 *
 * @param {string} pageName - 页面名称
 * @param {string} rawContent - 原始内容
 * @param {'indent'|'markdown'} contentMode - 内容模式
 * @returns {Promise<void>}
 */
async function insertContentSequentially(pageName, rawContent, contentMode = 'indent') {
  const lines = rawContent.split('\n');
  const blockStack = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const indentLevel = getLineIndentLevel(line, contentMode);
    let content = extractLineContent(line, contentMode);

    if (!content) {
      i++;
      continue;
    }

    if (content.startsWith('```')) {
      let codeBlock = content + '\n';
      i++;

      while (i < lines.length) {
        const codeLine = lines[i];
        codeBlock += codeLine + '\n';

        if (codeLine.trim().startsWith('```')) {
          break;
        }

        i++;
      }

      content = codeBlock.trim();
    } else if (content.includes('|')) {
      let tableBlock = content + '\n';
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextContent = extractLineContent(nextLine, contentMode);

        if (nextContent && nextContent.includes('|')) {
          tableBlock += nextContent + '\n';
          i++;
          continue;
        }

        i--;
        break;
      }

      content = tableBlock.trim();
    }

    blockStack.splice(indentLevel);

    let parentUuid = null;
    if (indentLevel > 0 && blockStack[indentLevel - 1]) {
      parentUuid = blockStack[indentLevel - 1];
    }

    const insertedBlock = await logseq.Editor.insertBlock(
      parentUuid || pageName,
      content,
      {
        sibling: parentUuid ? false : (blockStack.length > 0)
      }
    );

    if (insertedBlock) {
      blockStack[indentLevel] = insertedBlock.uuid;
    }

    i++;
  }
}

/**
 * 替换当前页面内容
 * 
 * @param {string} convertedContent - 转换后的内容
 * @param {'indent'|'markdown'} contentMode - 内容模式
 * @returns {Promise<boolean>} - 是否成功
 */
export async function replaceCurrentPageContent(convertedContent, contentMode = 'indent') {
  try {
    const currentPage = await getCurrentPage();
    if (!currentPage) {
      showMessage('❌ 无法获取当前页面', 'error');
      return false;
    }
    
    // 获取当前页面的所有块
    const blocks = await getPageBlocks(currentPage.name);
    
    // 删除所有现有块
    if (blocks && blocks.length > 0) {
      for (const block of blocks) {
        await logseq.Editor.removeBlock(block.uuid);
      }
    }

    if (isContentEmpty(convertedContent)) {
      return true;
    }

    const batchBlocks = buildBatchBlocksFromContent(convertedContent, contentMode);
    if (!batchBlocks.length) {
      return true;
    }

    if (typeof logseq.Editor.insertBatchBlock === 'function') {
      try {
        await logseq.Editor.insertBatchBlock(currentPage.name, batchBlocks, {
          sibling: false
        });
        return true;
      } catch (batchError) {
        console.warn('批量插入失败，回退到逐块插入:', batchError);
      }
    }

    await insertContentSequentially(currentPage.name, convertedContent, contentMode);
    return true;
  } catch (error) {
    console.error('替换页面内容时出错:', error);
    showMessage(`❌ 覆盖失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 验证页面是否有内容
 * 
 * @param {Array} blocks - 页面块数组
 * @returns {boolean} - 是否有内容
 */
export function hasPageContent(blocks) {
  return blocks && blocks.length > 0;
}

/**
 * 验证内容是否为空
 * 
 * @param {string} content - 内容字符串
 * @returns {boolean} - 是否为空
 */
export function isContentEmpty(content) {
  return !content || !content.trim();
}

/**
 * 注册命令面板命令
 * 
 * @param {string} key - 命令key
 * @param {string} label - 命令标签
 * @param {Function} handler - 命令处理函数
 */
export function registerCommand(key, label, handler) {
  logseq.App.registerCommandPalette({
    key,
    label
  }, handler);
}

/**
 * 注册工具栏按钮
 * 
 * @param {string} key - 按钮key
 * @param {string} template - 按钮模板
 */
export function registerToolbarButton(key, template) {
  logseq.App.registerUIItem('toolbar', {
    key,
    template
  });
}
