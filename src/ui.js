/**
 * UI相关功能模块
 * 包含模态框模板、UI交互函数等
 */

/**
 * 生成Markdown转换结果模态框HTML
 * 
 * @param {string} markdownContent - Markdown内容
 * @returns {string} - HTML模板字符串
 */
export function createMarkdownResultModal(markdownContent) {
  return `
    <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 90vw; max-height: 90vh; width: 800px; display: flex; flex-direction: column;">
        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Markdown转换结果</h3>
        <p style="margin: 0 0 15px 0; color: #666;">以下是转换为标准Markdown格式的内容：</p>
        <textarea 
          id="markdown-content" 
          style="width: 100%; height: 400px; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; resize: none; outline: none; box-sizing: border-box;"
          readonly
        >${markdownContent}</textarea>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
           <button data-on-click="copyMarkdownContent" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;">
             复制到剪贴板
           </button>
           <button data-on-click="closeModal" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;">
             关闭
           </button>
         </div>
      </div>
    </div>
  `;
}

/**
 * 生成转换结果模态框HTML
 * 
 * @param {string} convertedContent - 转换后的内容
 * @returns {string} - HTML模板字符串
 */
export function createConvertedResultModal(convertedContent) {
  return `
    <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 90vw; max-height: 90vh; width: 800px; display: flex; flex-direction: column;">
        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">转换结果</h3>
        <p style="margin: 0 0 15px 0; color: #666;">请复制以下内容到新页面：</p>
        <textarea 
          id="converted-content" 
          style="width: 100%; height: 400px; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; resize: none; outline: none; box-sizing: border-box;"
          readonly
        >${convertedContent}</textarea>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
           <button data-on-click="replaceCurrentPage" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;">
             覆盖当前页面
           </button>
           <button data-on-click="copyContent" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;">
             复制到剪贴板
           </button>
           <button data-on-click="closeModal" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;">
             关闭
           </button>
         </div>
      </div>
    </div>
  `;
}





/**
 * UI交互函数集合
 */
export const uiHandlers = {
  /**
   * 复制转换内容到剪贴板
   */
  copyContent() {
    const textarea = parent.document.getElementById('converted-content');
    if (textarea) {
      textarea.select();
      parent.document.execCommand('copy');
      logseq.App.showMsg('✅ 内容已复制到剪贴板', 'success');
    }
  },
  
  /**
   * 复制Markdown内容到剪贴板
   */
  copyMarkdownContent() {
    const textarea = parent.document.getElementById('markdown-content');
    if (textarea) {
      textarea.select();
      parent.document.execCommand('copy');
      logseq.App.showMsg('✅ Markdown内容已复制到剪贴板', 'success');
    }
  },
  

  

  
  /**
   * 关闭模态框
   */
  closeModal() {
    // 清空所有模态框UI组件
    logseq.provideUI({
      key: 'converted-result-modal',
      template: ''
    });
    logseq.provideUI({
      key: 'markdown-result-modal',
      template: ''
    });
    
    // 延迟隐藏主UI，确保UI组件清理完成
    setTimeout(() => {
      logseq.hideMainUI();
    }, 10);
  }
};

/**
 * 显示模态框
 * 
 * @param {string} key - UI组件的key
 * @param {string} template - HTML模板
 */
export function showModal(key, template) {
  logseq.provideUI({
    key,
    template
  });
  logseq.showMainUI();
}

/**
 * 隐藏模态框
 * 
 * @param {string} key - UI组件的key
 */
export function hideModal(key) {
  logseq.provideUI({
    key,
    template: ''
  });
  logseq.hideMainUI();
}