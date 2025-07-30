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
 * 替换当前页面内容
 * 
 * @param {string} convertedContent - 转换后的内容
 * @returns {Promise<boolean>} - 是否成功
 */
export async function replaceCurrentPageContent(convertedContent) {
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
    
    // 解析转换内容并逐块插入
    const lines = convertedContent.split('\n');
    const blockStack = []; // 存储各层级的块UUID
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }
      
      // 计算缩进层级（每个tab算一级）
      const indentMatch = line.match(/^(\t*)/);
      const indentLevel = indentMatch ? indentMatch[1].length : 0;
      
      // 移除'- '前缀和缩进
      let content = line.replace(/^\t*- /, '').trim();
      if (!content) {
        i++;
        continue;
      }
      
      // 检查是否是代码块开始
      if (content.startsWith('```')) {
        let codeBlock = content + '\n';
        i++;
        // 收集整个代码块
        while (i < lines.length) {
          const codeLine = lines[i];
          codeBlock += codeLine + '\n';
          if (codeLine.trim().startsWith('```') && codeLine.trim() !== '```') {
            break;
          }
          if (codeLine.trim() === '```') {
            break;
          }
          i++;
        }
        content = codeBlock.trim();
      }
      // 检查是否是表格行
      else if (content.includes('|')) {
        let tableBlock = content + '\n';
        i++;
        // 收集整个表格
        while (i < lines.length) {
          const nextLine = lines[i];
          const nextContent = nextLine.replace(/^\t*- /, '').trim();
          if (nextContent && nextContent.includes('|')) {
            tableBlock += nextContent + '\n';
            i++;
          } else {
            i--; // 回退一行，因为不是表格的一部分
            break;
          }
        }
        content = tableBlock.trim();
      }
      
      // 调整blockStack到当前层级
      blockStack.splice(indentLevel);
      
      let parentUuid = null;
      if (indentLevel > 0 && blockStack[indentLevel - 1]) {
        parentUuid = blockStack[indentLevel - 1];
      }
      
      // 插入块
      const insertedBlock = await logseq.Editor.insertBlock(
        parentUuid || currentPage.name,
        content,
        {
          sibling: parentUuid ? false : (blockStack.length > 0)
        }
      );
      
      // 将新块UUID存储到对应层级
      if (insertedBlock) {
        blockStack[indentLevel] = insertedBlock.uuid;
      }
      
      i++;
    }
    
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