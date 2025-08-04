/**
 * 核心转换功能模块
 * 包含主要的转换功能和业务逻辑
 */

import { convertMdFormat, blocksToMarkdown, extractContent } from '../converters.js';
import { createMarkdownResultModal, createConvertedResultModal, showModal, uiHandlers } from '../ui.js';
import { getCurrentPage, getPageBlocks, showMessage, hasPageContent, isContentEmpty, replaceCurrentPageContent } from '../utils.js';

/**
 * 将Logseq块结构转换为Markdown格式
 */
export async function convertToMarkdown() {
  try {
    showMessage('🔄 正在转换为Markdown格式...', 'info');
    
    const currentPage = await getCurrentPage();
    if (!currentPage) {
      showMessage('❌ 未找到当前页面', 'error');
      return;
    }
    
    const blocks = await getPageBlocks(currentPage.name);
    if (!hasPageContent(blocks)) {
      showMessage('❌ 当前页面没有内容', 'warning');
      return;
    }
    
    const markdownContent = blocksToMarkdown(blocks);
    
    // 显示转换结果
    const resultHtml = createMarkdownResultModal(markdownContent);
    showModal('markdown-result-modal', resultHtml);
    
    showMessage('✅ 转换为Markdown完成！', 'success');
    
  } catch (error) {
    console.error('转换为Markdown时出错:', error);
    showMessage(`❌ 转换失败: ${error.message}`, 'error');
  }
}

/**
 * 处理当前页面的笔记内容
 */
export async function processCurrentPage() {
  try {
    showMessage('🔄 正在处理当前页面...', 'info');
    
    // 获取当前页面
    const currentPage = await getCurrentPage();
    if (!currentPage) {
      showMessage('❌ 未找到当前页面', 'error');
      return;
    }

    // 获取页面的所有块
    const blocks = await getPageBlocks(currentPage.name);
    if (!hasPageContent(blocks)) {
      showMessage('❌ 当前页面没有内容', 'warning');
      return;
    }

    const pageContent = extractContent(blocks);
    
    if (isContentEmpty(pageContent)) {
      showMessage('❌ 页面内容为空', 'warning');
      return;
    }
    
    // 转换格式
    const convertedContent = convertMdFormat(pageContent);
    console.log('转换后的内容:', convertedContent);
    
    try {
      // 显示转换结果在弹窗中，让用户手动复制
      const resultHtml = createConvertedResultModal(convertedContent);
      showModal('converted-result-modal', resultHtml);
      
      showMessage('✅ 转换完成！请从弹窗中复制内容', 'success');
      
    } catch (insertError) {
      console.error('插入内容时出错:', insertError);
      showMessage(`❌ 插入内容失败: ${insertError.message}`, 'error');
    }
    
  } catch (error) {
    console.error('处理页面时出错:', error);
    showMessage(`❌ 处理失败: ${error.message}`, 'error');
  }
}

/**
 * 替换当前页面内容的处理函数
 */
export async function replaceCurrentPage() {
  try {
    const textarea = parent.document.getElementById('converted-content');
    if (!textarea) {
      showMessage('❌ 无法获取转换内容', 'error');
      return;
    }
    
    const convertedContent = textarea.value;
    const success = await replaceCurrentPageContent(convertedContent);
    
    if (success) {
      // 关闭弹窗
      uiHandlers.closeModal();
      showMessage('✅ 页面内容已成功覆盖！', 'success');
    }
    
  } catch (error) {
    console.error('覆盖页面内容时出错:', error);
    showMessage(`❌ 覆盖失败: ${error.message}`, 'error');
  }
}