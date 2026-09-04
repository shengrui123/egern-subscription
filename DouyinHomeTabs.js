/**
 * 抖音 TikTok 基础模式（Loon Response Script）
 *
 * 1. 顶部频道只保留“关注、推荐”；
 * 2. 侧栏移除钱包、券包、团购等非基础入口；
 * 3. 仅修改已识别的导航数组，无法确认结构时保持原响应。
 */

const DEBUG = $argument?.debug === true;

const FIELD_NAMES = [
  "id",
  "key",
  "type",
  "tab_id",
  "tab_type",
  "identifier",
  "name",
  "title",
  "text",
  "label",
  "tab_name",
];

const FOLLOW_VALUES = new Set(["homepage_follow", "follow", "关注"]);
const RECOMMEND_VALUES = new Set([
  "homepage_hot_container",
  "homepage_hot",
  "homepage_recommend",
  "recommend",
  "hot",
  "推荐",
]);

const TOP_TAB_VALUES = new Set([
  ...FOLLOW_VALUES,
  ...RECOMMEND_VALUES,
  "homepage_mall",
  "homepage_nearby",
  "homepage_groupon",
  "homepage_tablive",
  "homepage_pad_hot",
  "homepage_hangout",
  "homepage_familiar",
  "homepage_playlet_stream",
  "homepage_pad_cinema",
  "homepage_pad_kids_v2",
  "homepage_pad_game",
  "homepage_mediumvideo",
  "城",
  "同城",
  "精选",
  "经验",
  "直播",
  "商城",
  "团购",
  "热点",
  "朋友",
  "短剧",
  "看剧",
  "少儿",
  "游戏",
]);

const BASIC_MENU_VALUES = new Set([
  "扫一扫",
  "设置",
  "观看历史",
  "离线缓存",
  "稍后再看",
]);

const EXTRA_MENU_VALUES = new Set([
  "乘车码",
  "我的钱包",
  "钱包",
  "券包",
  "附近团购",
  "我的转化记录",
  "抖音创作者中心",
  "抖音创作者…",
  "直播广场",
  "放映厅",
  "使用管理助手",
  "更多功能",
]);

const ALL_MENU_VALUES = new Set([
  ...BASIC_MENU_VALUES,
  ...EXTRA_MENU_VALUES,
]);

let topTabArrays = 0;
let menuArrays = 0;
let weatherFields = 0;

function log(message) {
  if (DEBUG) console.log(`[抖音 TikTok 基础模式] ${message}`);
}

function normalizedValues(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return [];

  return FIELD_NAMES
    .map((field) => item[field])
    .filter((value) => typeof value === "string" || typeof value === "number")
    .map((value) => String(value).trim().toLowerCase());
}

function hasKnownValue(item, values) {
  return normalizedValues(item).some((value) => values.has(value));
}

function simplifyTopTabs(list) {
  const knownCount = list.filter((item) => hasKnownValue(item, TOP_TAB_VALUES)).length;
  const follow = list.find((item) => hasKnownValue(item, FOLLOW_VALUES));
  const recommend = list.find((item) => hasKnownValue(item, RECOMMEND_VALUES));

  // 至少识别出三个频道且“关注、推荐”均存在时才处理，避免误伤普通列表。
  if (knownCount < 3 || !follow || !recommend) return list;

  topTabArrays += 1;
  return [follow, recommend];
}

function simplifyMenu(list) {
  const knownCount = list.filter((item) => hasKnownValue(item, ALL_MENU_VALUES)).length;
  const basicCount = list.filter((item) => hasKnownValue(item, BASIC_MENU_VALUES)).length;

  // 同时存在基础入口和多个已知入口时才视为侧栏菜单数组。
  if (knownCount < 2 || basicCount < 1) return list;

  const filtered = list.filter((item) => !hasKnownValue(item, EXTRA_MENU_VALUES));
  if (filtered.length === list.length) return list;

  menuArrays += 1;
  return filtered;
}

function clean(value) {
  if (Array.isArray(value)) {
    const children = value.map(clean);
    return simplifyMenu(simplifyTopTabs(children));
  }

  if (!value || typeof value !== "object") return value;

  for (const key of Object.keys(value)) {
    // 仅对命中的配置类接口移除服务端天气配置；原生天气视图不受此项控制。
    if (/^(?:weather|weather_info|weather_entry|weather_label)$/i.test(key)) {
      delete value[key];
      weatherFields += 1;
      continue;
    }

    value[key] = clean(value[key]);
  }

  return value;
}

try {
  if (typeof $response.body !== "string" || !$response.body) {
    throw new Error("响应体为空或不是文本 JSON");
  }

  const body = clean(JSON.parse($response.body));
  const changed = topTabArrays + menuArrays + weatherFields > 0;

  log(
    `顶部数组=${topTabArrays}，侧栏数组=${menuArrays}，天气字段=${weatherFields}`,
  );

  $done(changed ? { body: JSON.stringify(body) } : {});
} catch (error) {
  log(`保持原响应：${error.message || error}`);
  $done({});
}
