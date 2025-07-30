/**
 * 主入口文件
 * 整合所有模块，注册命令和UI组件
 */

import { coreFunctions } from './core.js';
import { registerCommand, registerToolbarButton, showMessage } from './utils.js';

/**
 * 插件主函数
 */
function main() {
  // 注册命令面板命令
  registerCommand(
    'convert-md-format',
    '转换当前页面为缩进格式',
    coreFunctions.processCurrentPage
  );
  
  registerCommand(
    'convert-to-markdown',
    '转换当前页面为Markdown格式',
    coreFunctions.convertToMarkdown
  );

  // 添加工具栏按钮
  registerToolbarButton('convert-md-format-btn', `
    <a class="button" data-on-click="processCurrentPage" title="转换当前页面为缩进格式">
      <i class="ti ti-indent-increase"></i>
    </a>
  `);
  
  registerToolbarButton('convert-to-markdown-btn', `
    <a class="button" data-on-click="convertToMarkdown" title="转换当前页面为Markdown格式">
      <i class="ti ti-markdown"></i>
    </a>
  `);

  // 注册点击事件处理函数
  logseq.provideModel(coreFunctions);

  showMessage('📝 Markdown格式转换插件已加载！使用命令面板或点击工具栏按钮来转换当前页面', 'success');
}

// 插件启动
logseq.ready(main).catch(console.error);