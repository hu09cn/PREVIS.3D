import type { IntentSummary, SceneTemplateId } from './dslSchema';

interface TokenRule {
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => string;
}

const STYLE_RULES: RegExp[] = [
  /黄昏|夕阳|日落|暮色|sunset|dusk/i,
  /夜|深夜|黑夜|雨夜|月光|night/i,
  /暴雨|雨天|大雨|rain|storm/i,
  /大雾|迷雾|雾|薄雾|fog|mist/i,
  /逆光|剪影|低调|高对比|暗黑|赛博|废墟|工业风|科幻|写实/i,
  /正午|烈日|晴朗|白天|noon|sunny/i,
];

const LAYOUT_RULES: RegExp[] = [
  /围合|环形|四周|围绕/i,
  /中央|中心|中间/i,
  /两侧|两边|对面|面对面|对峙|对立/i,
  /路口|十字路口|街道|主街|大道/i,
  /狭窄|窄巷|小巷|走廊/i,
  /室内外|穿门|一楼|二楼|大厅|室内/i,
  /天台|屋顶|楼顶|高处/i,
  /高台|坡道|山坡|丘陵|斜坡上/i,
  /河岸|运河|水渠|码头|桥边/i,
  /堵住|封锁|阻挡|排列|车队/i,
];

const CAMERA_RULES: RegExp[] = [
  /推镜头|推近|推进|dolly[\s_-]?in/i,
  /拉镜头|拉远|后撤|dolly[\s_-]?out/i,
  /环绕|围绕旋转|orbit/i,
  /低角度|仰拍|low[\s_-]?angle/i,
  /高角度|俯拍|俯视|bird/i,
  /希区柯克|变焦|vertigo|dolly[\s_-]?zoom/i,
  /一镜到底|穿门|跟拍|tracking|follow/i,
  /特写|近景|中景|全景|广角|长焦/i,
];

const MUST_HAVE_PATTERNS: TokenRule[] = [
  { pattern: /([一二两三四五六七八九十\d]+[根座条辆名个组栋]?立柱|柱子|石柱|pillar|column)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[座块个]?高台|平台|看台|废墟大厅|platform)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[条座个]?斜坡|坡道|ramp)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[级条段座]?台阶|楼梯|stairs)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[辆台部架]?(?:汽车|警车|卡车|越野车|轿车|车辆|车队|车)|vehicle|car|truck)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[排组个]?(?:防撞墩|路障|水泥墩|护栏|铁丝网)|barrier)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[堆个组]?(?:货箱|集装箱|木箱|补给箱|箱子)|crate|cargo|container)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[堵面段]?墙体?|高墙|围墙|女儿墙|wall)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[扇个]?门框|门洞|入口|大门|doorway|gate)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[棵片排]?树木?|乔木|灌木|森林|行道树|tree|bush)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[盏排根]?路灯|街灯|lamp|streetlight)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[张个]?长?桌(?:子|台)?|会议桌|table)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[栋座排]?(?:大厦|大楼|建筑|楼房|厂房|仓库|民居|商场)|building|warehouse|tower)/gi, extract: (m) => m[0] },
  { pattern: /(安全屋|两层建筑|可进入建筑|hero[\s_-]?building)/gi, extract: (m) => m[0] },
  { pattern: /([一二两三四五六七八九十\d]*[名个位]?(?:特工|主角|守卫|哨兵|狙击手|杀手|敌人|对手|巡逻者|行人|士兵|队员|人物|角色|人))/gi, extract: (m) => m[0] },
  { pattern: /(持枪|瞄准|蹲伏|掩体后|奔跑|冲刺|坐姿|靠墙|探头俯瞰|对峙)/gi, extract: (m) => m[0] },
  { pattern: /(河道|运河|河岸|海滨|码头|大桥|桥梁|天台|屋顶|废墟|工业区|商业街|大雾|黄昏|暴雨|夜)/gi, extract: (m) => m[0] },
];

const VAGUE_ONLY_PATTERN =
  /^(来个酷的|来一个酷的场景|酷一点|随便|都可以|好看点的?|帮我生成一个|生成场景|测试|test|cool|anything|surprise me)[!！。.\s]*$/i;

export function recommendTemplate(prompt: string): SceneTemplateId {
  const p = prompt.toLowerCase();
  if (/室内|大厅|安全屋|走廊|会议|门框|interior|lobby/.test(p)) return 'interior';
  if (/天台|屋顶|楼顶|狙击|rooftop/.test(p)) return 'rooftop';
  if (/巷|窄巷|暗巷|胡同|alley/.test(p)) return 'alley';
  if (/广场|高台|立柱|废墟大厅|庭院|plaza|courtyard/.test(p)) return 'plaza';
  return 'street';
}

/**
 * Step 1: Deterministic Intent Summarizer (runs locally, NEVER via DeepSeek).
 * Extracts non-guessable user specifications cleanly; leaves unmentioned fields empty
 * and marks `ambiguous: true` with follow-up questions if core intent is vague.
 */
export function buildIntentSummary(rawPrompt: string): IntentSummary {
  const prompt = rawPrompt.trim();
  const questions: string[] = [];

  // Forbidden items (e.g. 不要/禁止/不能有/没有/别放 X)
  const forbidden: string[] = [];
  const forbidMatches = prompt.matchAll(/(?:不要|别放|别加|禁止|不能有|去掉|无)\s*([^\s，。,.!！;；]{1,14})/g);
  for (const m of forbidMatches) {
    if (m[1]) forbidden.push(m[1]);
  }

  // Must-have concrete elements (strip forbidden substrings first)
  let cleanForMust = prompt;
  for (const f of forbidden) {
    cleanForMust = cleanForMust.replace(f, '');
  }

  const mustSet = new Set<string>();
  for (const rule of MUST_HAVE_PATTERNS) {
    const matches = cleanForMust.match(rule.pattern);
    if (matches) {
      for (const m of matches) {
        const trimmed = m.trim();
        if (trimmed && trimmed.length >= 1 && !forbidden.includes(trimmed)) {
          mustSet.add(trimmed);
        }
      }
    }
  }
  const must_have = Array.from(mustSet);

  // Visual style phrases
  const styleHits: string[] = [];
  for (const r of STYLE_RULES) {
    const m = prompt.match(r);
    if (m?.[0]) styleHits.push(m[0]);
  }
  const style = styleHits.length > 0 ? Array.from(new Set(styleHits)).join(' · ') : '';

  // Spatial layout phrases
  const layoutHits: string[] = [];
  for (const r of LAYOUT_RULES) {
    const m = prompt.match(r);
    if (m?.[0]) layoutHits.push(m[0]);
  }
  const layout = layoutHits.length > 0 ? Array.from(new Set(layoutHits)).join(' · ') : '';

  // Camera intent phrases
  const camHits: string[] = [];
  for (const r of CAMERA_RULES) {
    const m = prompt.match(r);
    if (m?.[0]) camHits.push(m[0]);
  }
  const camera_intent = camHits.length > 0 ? Array.from(new Set(camHits)).join(' · ') : '';

  // Determine ambiguity strictly without blocking valid detailed user prompts
  const isVeryShortOrVague = VAGUE_ONLY_PATTERN.test(prompt) || prompt.length < 4;
  if (isVeryShortOrVague || (must_have.length === 0 && prompt.length < 12)) {
    questions.push('请明确场景中必须包含的具体建筑、道具或人物角色（如：四根立柱、两辆车、两名持枪特工）');
  }

  const ambiguous =
    isVeryShortOrVague || (must_have.length === 0 && !layout && prompt.length < 12);

  return {
    style,
    layout,
    must_have,
    camera_intent,
    forbidden,
    ambiguous,
    clarification_questions: ambiguous ? questions : [],
    recommended_template: recommendTemplate(prompt),
  };
}
