/**
 * 将 Markdown 转换为带缩进的格式
 * 
 * 
 * @param {string} mdContent - Markdown 内容
 * @returns {string} - 转换后的内容
 */
function convertMdFormat(mdContent) {
  const lines = mdContent.trim().split('\n');
  if (!lines.length) {
    return '';
  }

  const convertedLines = [];
  const stack = []; // 标题层级栈
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
        codeBlockIndent = '\t'.repeat(stack.length);
        convertedLines.push(`${codeBlockIndent}- ${stripped}`);
      } else {
        // 结束代码块
        inCodeBlock = false;
        convertedLines.push(`${codeBlockIndent}${stripped}`);
        codeBlockIndent = '';
      }
      continue;
    }
    
    // 如果在代码块内，保持原有格式，不添加'- '前缀
    if (inCodeBlock) {
      convertedLines.push(`${codeBlockIndent}${line}`);
      continue;
    }
    
    // 检查表格行（以|开头或包含|的行）
    if (stripped.includes('|') && stripped.trim() !== '') {
      if (!inTable) {
        // 开始表格
        inTable = true;
        tableIndent = '\t'.repeat(stack.length);
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
    while (tempStripped.startsWith('#')) {
      level++;
      prefix += '#';
      tempStripped = tempStripped.substring(1).trim();
    }

    if (level > 0) { // 如果是标题行
      if (level === 1) {
        // 一级标题保持原样，不添加缩进和前缀
        convertedLines.push(stripped);
        stack.length = 0; // 清空栈
        stack.push(level);
      } else {
        // 调整栈，移除比当前级别深的所有标题
        while (stack.length && level <= stack[stack.length - 1]) {
          stack.pop();
        }
        stack.push(level);

        // 缩进量为当前层级深度减1（因为一级标题不计入缩进）
        const indent = '\t'.repeat(stack.length - 1);
        convertedLines.push(`${indent}- ${stripped}`);
      }
    } else { // 非标题行
      // 缩进量为当前最深层级的深度
      const indent = '\t'.repeat(stack.length);
      convertedLines.push(`${indent}- ${stripped}`);
    }
  }

  return convertedLines.join('\n');
}

/**
 * 处理当前页面的笔记内容
 */
async function processCurrentPage() {
  try {
    logseq.App.showMsg('🔄 正在处理当前页面...', 'info');

    
    
    // 获取当前页面
    const currentPage = await logseq.Editor.getCurrentPage();
    if (!currentPage) {
      logseq.App.showMsg('❌ 未找到当前页面', 'error');
      return;
    }

    // 获取页面的所有块
    const blocks = await logseq.Editor.getPageBlocksTree(currentPage.name);
    if (!blocks || blocks.length === 0) {
      logseq.App.showMsg('❌ 当前页面没有内容', 'warning');
      return;
    }

    // 提取所有块的内容并组合成markdown（添加深度限制防止无限递归）
    function extractContent(blocks, depth = 0, maxDepth = 10, visited = new Set()) {
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

    const pageContent = extractContent(blocks);
    
    if (!pageContent.trim()) {
      logseq.App.showMsg('❌ 页面内容为空', 'warning');
      return;
    }
    
    // 转换格式
    const convertedContent = convertMdFormat(pageContent);
    console.log('转换后的内容:',convertedContent);
    // 创建新页面来显示结果
    const resultPageName = `${currentPage.name}-converted`;
    
    try {
      // 显示转换结果在弹窗中，让用户手动复制
      const resultHtml = `
        <div style="padding: 20px; max-width: 800px; max-height: 600px; overflow-y: auto;">
          <h3>转换结果</h3>
          <p>请复制以下内容到新页面：</p>
          <textarea 
            id="converted-content" 
            style="width: 100%; height: 400px; font-family: monospace; font-size: 14px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"
            readonly
          >${convertedContent}</textarea>
          <div style="margin-top: 10px;">
            <button data-on-click="copyContent" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
              复制到剪贴板
            </button>
            <button data-on-click="closeModal" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
              关闭
            </button>
          </div>
        </div>
      `;
      
      logseq.provideUI({
        key: 'converted-result-modal',
        template: resultHtml,
        style: {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000
        }
      });
      
      logseq.showMainUI();
      
      logseq.App.showMsg('✅ 转换完成！请从弹窗中复制内容', 'success');
      
    } catch (insertError) {
      console.error('插入内容时出错:', insertError);
      logseq.App.showMsg(`❌ 插入内容失败: ${insertError.message}`, 'error');
    }
    
  } catch (error) {
    console.error('处理页面时出错:', error);
    logseq.App.showMsg(`❌ 处理失败: ${error.message}`, 'error');
  }
}

/**
 * entry
 */
function main() {
  // 注册命令
  logseq.App.registerCommandPalette({
    key: 'convert-md-format',
    label: '转换当前页面为缩进格式'
  }, processCurrentPage);

  // 添加工具栏按钮
  logseq.App.registerUIItem('toolbar', {
    key: 'convert-md-format-btn',
    template: `
      <a class="button" data-on-click="processCurrentPage" title="转换当前页面为缩进格式">
        <i class="ti ti-indent-increase"></i>
      </a>
    `
  });

  // 注册点击事件

  
  logseq.provideModel({
    processCurrentPage,
    copyContent() {
      const textarea = parent.document.getElementById('converted-content');
      if (textarea) {
        textarea.select();
        parent.document.execCommand('copy');
        logseq.App.showMsg('✅ 内容已复制到剪贴板', 'success');
      }
    },
    closeModal() {
      logseq.hideMainUI();
    }
  });

  logseq.App.showMsg('📝 Markdown格式转换插件已加载！使用命令面板或点击工具栏按钮来转换当前页面', 'success');
}

// bootstrap
logseq.ready(main).catch(console.error)
