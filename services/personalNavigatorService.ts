/**
 * Personal Navigator Service - Layer 4 Agent
 * 个人导航员：高情商的首席幕僚
 */

import {
  SignalLight,
  SIGNALS,
  NavigatorInput,
  NavigatorOutput,
  NavigatorRecommendation,
  DestinyReportSummary,
  UserPersonaSummary
} from '../prompts/personalNavigator';
import { DecisionImpactReport } from '../prompts/destinyEngine';
import { soulArchitect } from './soulArchitectService';

// ============================================================================
// 回复模板
// ============================================================================

interface ResponseTemplate {
  id: string;
  condition: (input: NavigatorInput) => boolean;
  generate: (input: NavigatorInput, signal: SignalLight) => string;
}

const RESPONSE_TEMPLATES: ResponseTemplate[] = [
  {
    // 高压力 + 高风险：温柔但坚定
    id: 'stressed_high_risk',
    condition: (input) => 
      input.userPersona.stressLevel > 60 && 
      ['high', 'extreme'].includes(input.destinyReport.riskLevel),
    generate: (input, signal) => {
      const { destinyReport, userPersona, decisionContext } = input;
      const failProb = Math.round((1 - destinyReport.successProbability) * 100);
      
      let response = `我知道你最近压力挺大的。`;
      
      if (userPersona.recentStruggles.length > 0) {
        response += `${userPersona.recentStruggles[0]}确实不容易。`;
      }
      
      if (userPersona.recentWins.length > 0) {
        response += `\n\n不过先说个好消息：${userPersona.recentWins[0]}。你比你想象的做得好。`;
      }
      
      response += `\n\n好，现在说正事——\n\n`;
      response += `${SIGNALS[signal].emoji} Boss，有件事必须跟你说。\n\n`;
      response += `我算过了，「${destinyReport.optimalPath}」现在的风险不小——`;
      response += `${failProb}% 的可能会在${destinyReport.jCurve.dipDuration}内陷入困境。\n\n`;
      
      response += `**我的建议**：\n`;
      response += `${getRecommendation(input).primary}\n\n`;
      
      if (destinyReport.alternativePath) {
        response += `**备选方案**：${destinyReport.alternativePath}\n\n`;
      }
      
      response += `**现在能做的一小步**：\n`;
      response += `${getRecommendation(input).immediateAction}\n\n`;
      
      response += `不管怎样，我都在。有什么想法随时说。`;
      
      return response;
    }
  },
  {
    // 红灯：高风险警告
    id: 'red_light',
    condition: (input) => 
      ['high', 'extreme'].includes(input.destinyReport.riskLevel) &&
      input.userPersona.stressLevel <= 60,
    generate: (input, signal) => {
      const { destinyReport } = input;
      const failProb = Math.round((1 - destinyReport.successProbability) * 100);
      
      let response = `${SIGNALS.red.emoji} Boss，这步棋风险不小，咱们得聊聊。\n\n`;
      
      response += `我跑了一遍数据：\n`;
      response += `• 失败概率：${failProb}%\n`;
      response += `• 最艰难时期：${destinyReport.jCurve.dipDuration}\n`;
      response += `• 回本时间：${destinyReport.jCurve.recoveryPoint}（如果顺利的话）\n\n`;
      
      response += `**问题是**：你现在的资源能否撑过这个「死亡谷」？\n\n`;
      
      response += `**我的建议**：\n`;
      response += `${getRecommendation(input).primary}\n\n`;
      
      response += `**先迈出这一步**：\n`;
      response += `${getRecommendation(input).immediateAction}\n\n`;
      
      response += `你怎么看？`;
      
      return response;
    }
  },
  {
    // 黄灯：需要调整
    id: 'yellow_light',
    condition: (input) => input.destinyReport.riskLevel === 'medium',
    generate: (input, signal) => {
      const { destinyReport } = input;
      
      let response = `${SIGNALS.yellow.emoji} 方向是对的，但需要调整节奏。\n\n`;
      
      response += `「${destinyReport.optimalPath}」成功率约 ${Math.round(destinyReport.successProbability * 100)}%，`;
      response += `不算低，但也不是十拿九稳。\n\n`;
      
      response += `**关键点**：\n`;
      response += `• 预计低谷期：${destinyReport.jCurve.dipDuration}\n`;
      response += `• 需要准备：${destinyReport.caveats[0] || '充足的备用资金和心理准备'}\n\n`;
      
      response += `**我的建议**：\n`;
      response += `${getRecommendation(input).primary}\n\n`;
      
      response += `**先迈出这一步**：\n`;
      response += `${getRecommendation(input).immediateAction}\n\n`;
      
      response += `准备好了吗？`;
      
      return response;
    }
  },
  {
    // 绿灯：放行
    id: 'green_light',
    condition: (input) => input.destinyReport.riskLevel === 'low',
    generate: (input, signal) => {
      const { destinyReport } = input;
      
      let response = `${SIGNALS.green.emoji} 这个方向稳了！\n\n`;
      
      response += `「${destinyReport.optimalPath}」成功率 ${Math.round(destinyReport.successProbability * 100)}%，`;
      response += `风险可控，和你的价值观也很匹配。\n\n`;
      
      response += `**下一步**：\n`;
      response += `${getRecommendation(input).primary}\n\n`;
      
      response += `需要我帮你${getRecommendation(input).immediateAction}吗？`;
      
      return response;
    }
  }
];

// ============================================================================
// 辅助函数
// ============================================================================

function determineSignal(input: NavigatorInput): SignalLight {
  const { destinyReport, userPersona } = input;
  
  // 极端风险或用户高压力 + 高风险 = 红灯
  if (destinyReport.riskLevel === 'extreme') return 'red';
  if (destinyReport.riskLevel === 'high' && userPersona.stressLevel > 50) return 'red';
  if (destinyReport.riskLevel === 'high' && userPersona.riskTolerance === 'low') return 'red';
  
  // 中等风险 = 黄灯
  if (destinyReport.riskLevel === 'medium') return 'yellow';
  if (destinyReport.riskLevel === 'high' && userPersona.riskTolerance === 'high') return 'yellow';
  
  // 低风险 = 绿灯
  return 'green';
}

function getRecommendation(input: NavigatorInput): NavigatorRecommendation {
  const { destinyReport, userPersona, decisionContext } = input;
  
  // 根据风险和用户特征生成建议
  if (destinyReport.riskLevel === 'extreme' || destinyReport.riskLevel === 'high') {
    // 高风险：建议降低风险
    return {
      primary: `暂时不要全力投入「${destinyReport.optimalPath}」。先用${userPersona.riskTolerance === 'high' ? '20%' : '10%'}的时间精力试水，验证可行性。`,
      alternative: destinyReport.alternativePath 
        ? `考虑「${destinyReport.alternativePath}」作为过渡方案` 
        : undefined,
      immediateAction: generateImmediateAction(input, 'cautious')
    };
  } else if (destinyReport.riskLevel === 'medium') {
    // 中等风险：建议准备充分
    return {
      primary: `「${destinyReport.optimalPath}」可以推进，但先确保有${destinyReport.jCurve.dipDuration}的资源储备。`,
      alternative: `如果资源不够，可以先从「${destinyReport.alternativePath || '小规模试点'}」开始`,
      immediateAction: generateImmediateAction(input, 'balanced')
    };
  } else {
    // 低风险：鼓励执行
    return {
      primary: `直接推进「${destinyReport.optimalPath}」。你的条件很适合。`,
      immediateAction: generateImmediateAction(input, 'confident')
    };
  }
}

function generateImmediateAction(input: NavigatorInput, mode: 'cautious' | 'balanced' | 'confident'): string {
  const { decisionContext } = input;
  const question = decisionContext.question.toLowerCase();
  
  // 职业相关
  if (question.includes('创业') || question.includes('辞职') || question.includes('工作')) {
    switch (mode) {
      case 'cautious':
        return '今晚花30分钟，列出创业想法的前3个待验证假设';
      case 'balanced':
        return '这周找2个在这个领域的朋友聊聊，验证你的想法';
      case 'confident':
        return '把今晚8-10点的时间block下来，开始第一步';
    }
  }
  
  // 财务相关
  if (question.includes('投资') || question.includes('买') || question.includes('钱')) {
    switch (mode) {
      case 'cautious':
        return '先用模拟盘练手，或只投入你能承受损失的5%';
      case 'balanced':
        return '做一份详细的收支预算，确认真正的可支配资金';
      case 'confident':
        return '设定好止损线，然后执行你的计划';
    }
  }
  
  // 关系相关
  if (question.includes('结婚') || question.includes('分手') || question.includes('关系')) {
    switch (mode) {
      case 'cautious':
        return '找个安静的时间，认真写下你真正想要什么';
      case 'balanced':
        return '和对方约个时间，坦诚地聊聊你们的期望';
      case 'confident':
        return '相信你的判断，安排一个正式的对话';
    }
  }
  
  // 通用
  switch (mode) {
    case 'cautious':
      return '今晚花20分钟，写下这个决定的3个最大风险和应对方案';
    case 'balanced':
      return '这周收集更多信息，下周一前做出决定';
    case 'confident':
      return '设定一个明确的开始日期，并告诉一个朋友来监督';
  }
}

function generateHeadline(signal: SignalLight, input: NavigatorInput): string {
  const { destinyReport } = input;
  
  switch (signal) {
    case 'red':
      return `${SIGNALS.red.emoji} Boss，「${destinyReport.optimalPath}」风险太高`;
    case 'yellow':
      return `${SIGNALS.yellow.emoji} 方向对了，但节奏需要调整`;
    case 'green':
      return `${SIGNALS.green.emoji} 稳了！「${destinyReport.optimalPath}」可以执行`;
  }
}

function generateInsight(input: NavigatorInput): string {
  const { destinyReport, userPersona } = input;
  const successProb = Math.round(destinyReport.successProbability * 100);
  const failProb = 100 - successProb;
  
  let insight = `数据显示「${destinyReport.optimalPath}」成功率约${successProb}%。`;
  
  if (failProb > 50) {
    insight += `这意味着超过一半的情况下会遇到困难。`;
  }
  
  if (destinyReport.jCurve.dipDepth < -40) {
    insight += `前${destinyReport.jCurve.dipDuration}会比较艰难，这是典型的J曲线下坠期。`;
  }
  
  // 根据用户价值观补充
  if (userPersona.topValues.includes('security') && destinyReport.riskLevel !== 'low') {
    insight += `考虑到你重视稳定，建议做好风险预案。`;
  }
  
  return insight;
}

function generateFollowUp(input: NavigatorInput, signal: SignalLight): string | undefined {
  if (signal === 'green') return undefined;
  
  const { decisionContext } = input;
  
  if (decisionContext.urgency === 'immediate') {
    return '这事真的必须现在决定吗？能不能给自己3天时间想清楚？';
  }
  
  if (signal === 'red') {
    return '你最担心的是什么？说出来我们一起想办法。';
  }
  
  return '你倾向于哪个方向？我可以帮你细化下一步。';
}

function generateEmotionalSupport(input: NavigatorInput): string | undefined {
  const { userPersona } = input;
  
  if (userPersona.stressLevel <= 40) return undefined;
  
  let support = '';
  
  if (userPersona.recentStruggles.length > 0) {
    support += `我知道「${userPersona.recentStruggles[0]}」让你挺累的。`;
  }
  
  if (userPersona.recentWins.length > 0) {
    support += `但别忘了，你最近还搞定了「${userPersona.recentWins[0]}」呢。`;
  }
  
  support += `不管怎样，我都在你这边。`;
  
  return support || undefined;
}

// ============================================================================
// Personal Navigator 核心类
// ============================================================================

export class PersonalNavigator {
  
  /**
   * 生成有温度的导航回复
   */
  craft(input: NavigatorInput): NavigatorOutput {
    const signal = determineSignal(input);
    const recommendation = getRecommendation(input);
    
    // 找到匹配的模板
    const template = RESPONSE_TEMPLATES.find(t => t.condition(input)) 
      || RESPONSE_TEMPLATES[RESPONSE_TEMPLATES.length - 1];
    
    const formattedResponse = template.generate(input, signal);
    
    return {
      signal,
      headline: generateHeadline(signal, input),
      insight: generateInsight(input),
      recommendation,
      followUpQuestion: generateFollowUp(input, signal),
      emotionalSupport: generateEmotionalSupport(input),
      formattedResponse
    };
  }
  
  /**
   * 快速生成回复（基于 Layer 3 输出）
   */
  quickCraft(destinyReport: Partial<DestinyReportSummary>, question: string): NavigatorOutput {
    // 从 Soul Architect 获取用户画像
    const soulSummary = soulArchitect.getSoulSummary();
    
    // 构建完整输入
    const input: NavigatorInput = {
      destinyReport: {
        optimalPath: destinyReport.optimalPath || '选项A',
        alternativePath: destinyReport.alternativePath || '选项B',
        successProbability: destinyReport.successProbability ?? 0.5,
        jCurve: destinyReport.jCurve || {
          dipDepth: -30,
          dipDuration: '3-6个月',
          recoveryPoint: '12个月'
        },
        riskLevel: destinyReport.riskLevel || 'medium',
        expectedValue: destinyReport.expectedValue ?? 0,
        caveats: destinyReport.caveats || []
      },
      userPersona: {
        stressLevel: soulSummary.stressLevel,
        riskTolerance: soulSummary.keyTraits.riskTolerance,
        communicationStyle: soulSummary.keyTraits.communicationStyle,
        currentMood: soulSummary.stressLevel > 60 ? 'anxious' : 'calm',
        topValues: soulSummary.topValues,
        recentWins: [],
        recentStruggles: soulSummary.stressLevel > 50 ? ['最近压力较大'] : []
      },
      decisionContext: {
        question,
        urgency: 'this_week',
        reversibility: 'moderate'
      }
    };
    
    return this.craft(input);
  }
  
  /**
   * 生成简短的即时反馈
   */
  quickFeedback(signal: SignalLight, context: string): string {
    switch (signal) {
      case 'green':
        return `🟢 看起来不错！${context}`;
      case 'yellow':
        return `🟡 可以，但注意${context}`;
      case 'red':
        return `🛑 等等，${context}`;
    }
  }
  
  /**
   * 根据情绪调整语气
   */
  adjustTone(message: string, stressLevel: number): string {
    if (stressLevel > 70) {
      // 高压力：添加安抚
      return `我知道这不容易。\n\n${message}\n\n深呼吸，一步一步来。`;
    } else if (stressLevel > 50) {
      // 中等压力：添加鼓励
      return `${message}\n\n你能行的。`;
    }
    return message;
  }
}

// 导出单例
export const personalNavigator = new PersonalNavigator();
