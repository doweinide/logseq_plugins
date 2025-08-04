/**
 * 核心处理器模块
 * 整合所有核心功能的处理函数
 */

import { convertToMarkdown, processCurrentPage, replaceCurrentPage } from './converter.js';
import { showMessage } from '../utils.js';



// 导出所有核心功能处理函数
export const coreFunctions = {
  // 原有功能
  convertToMarkdown,
  processCurrentPage,
  replaceCurrentPage
};

// 导出单独的处理函数
export {
  convertToMarkdown,
  processCurrentPage,
  replaceCurrentPage
};